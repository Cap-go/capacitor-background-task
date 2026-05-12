import BackgroundTasks
import Foundation
import UIKit

@objc public class BackgroundTask: NSObject {
    static let defaultIdentifier = "app.capgo.backgroundtask.processing"
    static let statusRestricted = 1
    static let statusAvailable = 2
    static let resultSuccess = 1
    static let resultFailed = 2
    static let defaultMinimumIntervalMinutes = 12 * 60
    static let minimumIntervalMinutes = 15

    private let taskIdentifier: String
    private let defaults = UserDefaults.standard
    private weak var plugin: BackgroundTaskPlugin?
    private var schedulerRegistered = false
    private var runningTaskIds = Set<String>()
    private var activeTask: BGTask?
    private var activeTaskSucceeded = true

    private let taskNamesKey = "CapgoBackgroundTask.taskNames"
    private let taskPrefix = "CapgoBackgroundTask.task."
    private let pendingRunsKey = "CapgoBackgroundTask.pendingRuns"
    private let lastRunPrefix = "CapgoBackgroundTask.lastRun."
    private let lastResultPrefix = "CapgoBackgroundTask.lastResult."

    init(taskIdentifier: String = BackgroundTask.defaultIdentifier) {
        self.taskIdentifier = taskIdentifier
        super.init()
    }

    func configure(plugin: BackgroundTaskPlugin) {
        self.plugin = plugin
        registerScheduler()
        dispatchPendingRuns()
    }

    func registerTask(taskName: String, minimumInterval: Int, requiresNetwork: Bool) throws {
        let normalizedInterval = normalizeInterval(minimumInterval)
        var taskNames = getTaskNames()
        taskNames.insert(taskName)
        defaults.set(Array(taskNames), forKey: taskNamesKey)
        defaults.set(
            [
                "taskName": taskName,
                "minimumInterval": normalizedInterval,
                "requiresNetwork": requiresNetwork
            ],
            forKey: taskPrefix + taskName
        )
        try scheduleNextProcessingTask()
    }

    func unregisterTask(taskName: String) {
        var taskNames = getTaskNames()
        taskNames.remove(taskName)
        defaults.set(Array(taskNames), forKey: taskNamesKey)
        defaults.removeObject(forKey: taskPrefix + taskName)

        if taskNames.isEmpty {
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskIdentifier)
        } else {
            try? scheduleNextProcessingTask()
        }
    }

    func isTaskRegistered(taskName: String) -> Bool {
        getTaskNames().contains(taskName)
    }

    func getRegisteredTasks() -> [String] {
        Array(getTaskNames()).sorted()
    }

    func getPendingRuns() -> [[String: Any]] {
        defaults.array(forKey: pendingRunsKey) as? [[String: Any]] ?? []
    }

    func getStatus() -> Int {
        UIApplication.shared.backgroundRefreshStatus == .available ? BackgroundTask.statusAvailable : BackgroundTask.statusRestricted
    }

    func triggerTaskWorkerForTesting() -> Bool {
        let taskNames = getTaskNames()
        for taskName in taskNames {
            recordAndDispatchRun(taskName: taskName, isTest: true)
        }
        return !taskNames.isEmpty
    }

    func finish(taskId: String, taskName: String?, result: Int) {
        removePendingRun(taskId: taskId)

        if let taskName = taskName, !taskName.isEmpty {
            defaults.set(result, forKey: lastResultPrefix + taskName)
        }

        if runningTaskIds.contains(taskId) {
            activeTaskSucceeded = activeTaskSucceeded && result == BackgroundTask.resultSuccess
            runningTaskIds.remove(taskId)
        }

        completeActiveTaskIfNeeded()
    }

    private func registerScheduler() {
        guard !schedulerRegistered else {
            return
        }

        schedulerRegistered = BGTaskScheduler.shared.register(forTaskWithIdentifier: taskIdentifier, using: nil) { [weak self] task in
            self?.handleProcessingTask(task)
        }

        if schedulerRegistered {
            try? scheduleNextProcessingTask()
        }
    }

    private func handleProcessingTask(_ task: BGTask) {
        activeTask = task
        activeTaskSucceeded = true
        runningTaskIds.removeAll()
        try? scheduleNextProcessingTask()

        task.expirationHandler = { [weak self] in
            self?.handleExpiration()
        }

        let dueTaskNames = dueTasks()
        guard !dueTaskNames.isEmpty else {
            task.setTaskCompleted(success: true)
            activeTask = nil
            return
        }

        for taskName in dueTaskNames {
            let taskId = recordAndDispatchRun(taskName: taskName, isTest: false)
            runningTaskIds.insert(taskId)
            defaults.set(Date().timeIntervalSince1970, forKey: lastRunPrefix + taskName)
        }
    }

    private func handleExpiration() {
        for run in getPendingRuns() where runningTaskIds.contains(run["taskId"] as? String ?? "") {
            plugin?.notifyListeners("expiration", data: run, retainUntilConsumed: true)
        }

        runningTaskIds.removeAll()
        activeTaskSucceeded = false
        completeActiveTaskIfNeeded()
    }

    private func completeActiveTaskIfNeeded() {
        guard runningTaskIds.isEmpty, let task = activeTask else {
            return
        }

        task.setTaskCompleted(success: activeTaskSucceeded)
        activeTask = nil
        try? scheduleNextProcessingTask()
    }

    private func scheduleNextProcessingTask() throws {
        guard schedulerRegistered, !getTaskNames().isEmpty else {
            return
        }

        let request = BGProcessingTaskRequest(identifier: taskIdentifier)
        request.requiresNetworkConnectivity = anyTaskRequiresNetwork()
        request.requiresExternalPower = false
        request.earliestBeginDate = nextEarliestBeginDate()

        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskIdentifier)
        try BGTaskScheduler.shared.submit(request)
    }

    private func dueTasks() -> [String] {
        let now = Date().timeIntervalSince1970
        return getTaskNames().filter { taskName in
            let interval = TimeInterval(taskConfig(taskName: taskName).minimumInterval * 60)
            let lastRun = defaults.double(forKey: lastRunPrefix + taskName)
            return lastRun == 0 || now - lastRun >= interval
        }
    }

    private func nextEarliestBeginDate() -> Date {
        let now = Date()
        var earliestDate = now.addingTimeInterval(TimeInterval(BackgroundTask.defaultMinimumIntervalMinutes * 60))

        for taskName in getTaskNames() {
            let config = taskConfig(taskName: taskName)
            let interval = TimeInterval(config.minimumInterval * 60)
            let lastRun = defaults.double(forKey: lastRunPrefix + taskName)
            let nextDate = lastRun == 0 ? now.addingTimeInterval(interval) : Date(timeIntervalSince1970: lastRun + interval)
            if nextDate < earliestDate {
                earliestDate = nextDate
            }
        }

        return earliestDate
    }

    private func anyTaskRequiresNetwork() -> Bool {
        getTaskNames().contains { taskConfig(taskName: $0).requiresNetwork }
    }

    @discardableResult
    private func recordAndDispatchRun(taskName: String, isTest: Bool) -> String {
        let taskId = UUID().uuidString
        let run: [String: Any] = [
            "taskName": taskName,
            "taskId": taskId,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
            "test": isTest
        ]

        addPendingRun(run)
        plugin?.notifyListeners("backgroundTask", data: run, retainUntilConsumed: true)
        return taskId
    }

    private func dispatchPendingRuns() {
        for run in getPendingRuns() {
            plugin?.notifyListeners("backgroundTask", data: run, retainUntilConsumed: true)
        }
    }

    private func addPendingRun(_ run: [String: Any]) {
        var runs = getPendingRuns()
        runs.append(run)
        defaults.set(runs, forKey: pendingRunsKey)
    }

    private func removePendingRun(taskId: String) {
        let runs = getPendingRuns().filter { run in
            run["taskId"] as? String != taskId
        }
        defaults.set(runs, forKey: pendingRunsKey)
    }

    private func getTaskNames() -> Set<String> {
        Set(defaults.stringArray(forKey: taskNamesKey) ?? [])
    }

    private func taskConfig(taskName: String) -> TaskConfig {
        guard let rawConfig = defaults.dictionary(forKey: taskPrefix + taskName) else {
            return TaskConfig(minimumInterval: BackgroundTask.defaultMinimumIntervalMinutes, requiresNetwork: true)
        }

        return TaskConfig(
            minimumInterval: normalizeInterval(rawConfig["minimumInterval"] as? Int ?? BackgroundTask.defaultMinimumIntervalMinutes),
            requiresNetwork: rawConfig["requiresNetwork"] as? Bool ?? true
        )
    }

    private func normalizeInterval(_ minimumInterval: Int) -> Int {
        if minimumInterval <= 0 {
            return BackgroundTask.defaultMinimumIntervalMinutes
        }
        return max(BackgroundTask.minimumIntervalMinutes, minimumInterval)
    }
}

private struct TaskConfig {
    let minimumInterval: Int
    let requiresNetwork: Bool
}
