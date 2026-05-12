import { registerPlugin } from '@capacitor/core';

import type {
  BackgroundTaskCallback,
  BackgroundTaskEvent,
  BackgroundTaskOptions,
  BackgroundTaskPlugin,
  FinishOptions,
  NativeBackgroundTaskPlugin,
  ReactNativeBackgroundTaskOptions,
} from './definitions';
import { BackgroundTaskResult, BackgroundTaskStatus } from './definitions';

const DEFAULT_TASK_NAME = 'CapgoBackgroundTask';

const NativeBackgroundTask = registerPlugin<NativeBackgroundTaskPlugin>('BackgroundTask', {
  web: () => import('./web').then((m) => new m.BackgroundTaskWeb()),
});

const callbacks = new Map<string, BackgroundTaskCallback>();
const processedTaskIds = new Set<string>();
let listenerReady: Promise<void> | undefined;
let currentReactNativeTask: FinishOptions | undefined;

const ensureListener = (): Promise<void> => {
  if (!listenerReady) {
    listenerReady = NativeBackgroundTask.addListener('backgroundTask', (event) => {
      void runTask(event);
    }).then(() => undefined);
  }
  return listenerReady;
};

const drainPendingTaskRuns = async (): Promise<void> => {
  const { tasks } = await NativeBackgroundTask.getPendingTaskRuns();
  await Promise.all(tasks.map((task) => runTask(task)));
};

const runTask = async (event: BackgroundTaskEvent): Promise<void> => {
  if (processedTaskIds.has(event.taskId)) {
    return;
  }

  const callback = callbacks.get(event.taskName);
  if (!callback) {
    return;
  }

  processedTaskIds.add(event.taskId);

  try {
    currentReactNativeTask = {
      taskId: event.taskId,
      taskName: event.taskName,
      result: BackgroundTaskResult.Success,
    };

    const result = await callback(event);
    await NativeBackgroundTask.finish({
      taskId: event.taskId,
      taskName: event.taskName,
      result: result ?? BackgroundTaskResult.Success,
    });
  } catch {
    await NativeBackgroundTask.finish({
      taskId: event.taskId,
      taskName: event.taskName,
      result: BackgroundTaskResult.Failed,
    });
  } finally {
    currentReactNativeTask = undefined;
  }
};

const assertTaskName = (taskName: string): void => {
  if (!taskName || typeof taskName !== 'string') {
    throw new Error('taskName is required');
  }
};

const normalizeReactNativeOptions = (options?: ReactNativeBackgroundTaskOptions): BackgroundTaskOptions => {
  const period = options?.period ?? 900;
  return {
    minimumInterval: Math.max(15, Math.ceil(period / 60)),
  };
};

const BackgroundTask: BackgroundTaskPlugin = {
  defineTask(taskName, callback) {
    assertTaskName(taskName);
    callbacks.set(taskName, callback);
    void ensureListener().then(drainPendingTaskRuns);
  },

  async registerTaskAsync(taskName, options) {
    assertTaskName(taskName);
    if (!callbacks.has(taskName)) {
      throw new Error(`Task "${taskName}" must be defined before it is registered.`);
    }
    await NativeBackgroundTask.registerTask({ taskName, options });
    await ensureListener();
    await drainPendingTaskRuns();
  },

  async unregisterTaskAsync(taskName) {
    assertTaskName(taskName);
    await NativeBackgroundTask.unregisterTask({ taskName });
  },

  async isTaskRegisteredAsync(taskName) {
    assertTaskName(taskName);
    const { value } = await NativeBackgroundTask.isTaskRegistered({ taskName });
    return value;
  },

  async getRegisteredTasksAsync() {
    const { tasks } = await NativeBackgroundTask.getRegisteredTasks();
    return tasks;
  },

  async getPendingTaskRunsAsync() {
    const { tasks } = await NativeBackgroundTask.getPendingTaskRuns();
    return tasks;
  },

  async getStatusAsync() {
    const { status } = await NativeBackgroundTask.getStatus();
    return status;
  },

  async triggerTaskWorkerForTestingAsync() {
    await ensureListener();
    const { value } = await NativeBackgroundTask.triggerTaskWorkerForTesting();
    await drainPendingTaskRuns();
    return value;
  },

  addExpirationListener(listener) {
    return NativeBackgroundTask.addListener('expiration', listener);
  },

  define(callback) {
    this.defineTask(DEFAULT_TASK_NAME, callback);
  },

  schedule(options) {
    return this.registerTaskAsync(DEFAULT_TASK_NAME, normalizeReactNativeOptions(options));
  },

  cancel() {
    return this.unregisterTaskAsync(DEFAULT_TASK_NAME);
  },

  async statusAsync() {
    const status = await this.getStatusAsync();
    if (status === BackgroundTaskStatus.Available) {
      return { available: true };
    }
    return {
      available: false,
      unavailableReason: 'restricted',
    };
  },

  async finish(result = BackgroundTaskResult.Success) {
    if (!currentReactNativeTask) {
      return;
    }

    await NativeBackgroundTask.finish({
      ...currentReactNativeTask,
      result,
    });
  },
};

export * from './definitions';
export { BackgroundTask, NativeBackgroundTask };
