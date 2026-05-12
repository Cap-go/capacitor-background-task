import { WebPlugin } from '@capacitor/core';

import type {
  BooleanResult,
  GetStatusResult,
  NativeBackgroundTaskPlugin,
  PendingTaskRunsResult,
  RegisteredTasksResult,
  RegisterTaskOptions,
  TaskNameOptions,
} from './definitions';
import { BackgroundTaskStatus } from './definitions';

export class BackgroundTaskWeb extends WebPlugin implements NativeBackgroundTaskPlugin {
  private readonly registeredTasks = new Map<string, RegisterTaskOptions>();

  async registerTask(options: RegisterTaskOptions): Promise<void> {
    this.registeredTasks.set(options.taskName, options);
  }

  async unregisterTask(options: TaskNameOptions): Promise<void> {
    this.registeredTasks.delete(options.taskName);
  }

  async isTaskRegistered(options: TaskNameOptions): Promise<BooleanResult> {
    return {
      value: this.registeredTasks.has(options.taskName),
    };
  }

  async getRegisteredTasks(): Promise<RegisteredTasksResult> {
    return {
      tasks: [...this.registeredTasks.keys()],
    };
  }

  async getPendingTaskRuns(): Promise<PendingTaskRunsResult> {
    return {
      tasks: [],
    };
  }

  async getStatus(): Promise<GetStatusResult> {
    return {
      status: BackgroundTaskStatus.Restricted,
    };
  }

  async triggerTaskWorkerForTesting(): Promise<BooleanResult> {
    const timestamp = Date.now();

    for (const taskName of this.registeredTasks.keys()) {
      void this.notifyListeners('backgroundTask', {
        taskName,
        taskId: `${taskName}:${timestamp}`,
        timestamp,
        test: true,
      });
    }

    return {
      value: this.registeredTasks.size > 0,
    };
  }

  async finish(): Promise<void> {
    return;
  }
}
