import XCTest
@testable import BackgroundTaskPlugin

class BackgroundTaskTests: XCTestCase {
    func testRegisterAndUnregisterTask() throws {
        let implementation = BackgroundTask()
        let taskName = "unit-test-background-task"

        implementation.unregisterTask(taskName: taskName)
        XCTAssertFalse(implementation.isTaskRegistered(taskName: taskName))

        try implementation.registerTask(taskName: taskName, minimumInterval: 1, requiresNetwork: false)
        XCTAssertTrue(implementation.isTaskRegistered(taskName: taskName))

        implementation.unregisterTask(taskName: taskName)
        XCTAssertFalse(implementation.isTaskRegistered(taskName: taskName))
    }
}
