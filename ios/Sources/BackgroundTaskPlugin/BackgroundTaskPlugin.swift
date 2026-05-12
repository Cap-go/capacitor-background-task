import Foundation
import Capacitor

@objc(BackgroundTaskPlugin)
public class BackgroundTaskPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundTaskPlugin"
    public let jsName = "BackgroundTask"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "registerTask", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unregisterTask", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isTaskRegistered", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRegisteredTasks", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingTaskRuns", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "triggerTaskWorkerForTesting", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]

    private lazy var implementation = BackgroundTask()

    override public func load() {
        implementation.configure(plugin: self)
    }

    @objc func registerTask(_ call: CAPPluginCall) {
        guard let taskName = call.getString("taskName"), !taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("taskName is required")
            return
        }

        let options = call.getObject("options") ?? [:]
        let minimumInterval = options["minimumInterval"] as? Int ?? BackgroundTask.defaultMinimumIntervalMinutes
        let requiresNetwork = options["requiresNetwork"] as? Bool ?? true

        do {
            try implementation.registerTask(taskName: taskName, minimumInterval: minimumInterval, requiresNetwork: requiresNetwork)
            call.resolve()
        } catch {
            call.reject("Unable to register background task", nil, error)
        }
    }

    @objc func unregisterTask(_ call: CAPPluginCall) {
        guard let taskName = call.getString("taskName"), !taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("taskName is required")
            return
        }

        implementation.unregisterTask(taskName: taskName)
        call.resolve()
    }

    @objc func isTaskRegistered(_ call: CAPPluginCall) {
        guard let taskName = call.getString("taskName"), !taskName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("taskName is required")
            return
        }

        call.resolve([
            "value": implementation.isTaskRegistered(taskName: taskName)
        ])
    }

    @objc func getRegisteredTasks(_ call: CAPPluginCall) {
        call.resolve([
            "tasks": implementation.getRegisteredTasks()
        ])
    }

    @objc func getPendingTaskRuns(_ call: CAPPluginCall) {
        call.resolve([
            "tasks": implementation.getPendingRuns()
        ])
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        call.resolve([
            "status": implementation.getStatus()
        ])
    }

    @objc func triggerTaskWorkerForTesting(_ call: CAPPluginCall) {
        call.resolve([
            "value": implementation.triggerTaskWorkerForTesting()
        ])
    }

    @objc func finish(_ call: CAPPluginCall) {
        guard let taskId = call.getString("taskId"), !taskId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("taskId is required")
            return
        }

        implementation.finish(
            taskId: taskId,
            taskName: call.getString("taskName"),
            result: call.getInt("result") ?? BackgroundTask.resultSuccess
        )
        call.resolve()
    }
}
