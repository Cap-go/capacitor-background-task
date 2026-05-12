import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Return value for a background task callback.
 */
export enum BackgroundTaskResult {
  /**
   * The task finished successfully.
   */
  Success = 1,

  /**
   * The task failed.
   */
  Failed = 2,
}

/**
 * Availability status for background task scheduling.
 */
export enum BackgroundTaskStatus {
  /**
   * Background task scheduling is unavailable or restricted.
   */
  Restricted = 1,

  /**
   * Background task scheduling is available.
   */
  Available = 2,
}

/**
 * Options for registering a periodic background task.
 */
export interface BackgroundTaskOptions {
  /**
   * Inexact interval in minutes between task runs.
   *
   * Defaults to 720 minutes. Android enforces a 15 minute minimum. iOS treats
   * this as an earliest begin date and may run much later.
   */
  minimumInterval?: number;

  /**
   * Require an active network before running the native scheduler.
   *
   * Defaults to true.
   */
  requiresNetwork?: boolean;
}

/**
 * Payload emitted when native scheduling asks JavaScript to run a task.
 */
export interface BackgroundTaskEvent {
  /**
   * Name passed to registerTaskAsync.
   */
  taskName: string;

  /**
   * Native run identifier. The JavaScript wrapper finishes it automatically
   * when the defined callback resolves.
   */
  taskId: string;

  /**
   * Native timestamp for the run.
   */
  timestamp: number;

  /**
   * True when triggered through triggerTaskWorkerForTestingAsync.
   */
  test?: boolean;
}

/**
 * Function executed for a background task.
 */
export type BackgroundTaskCallback = (
  event: BackgroundTaskEvent,
) => Promise<BackgroundTaskResult | void> | BackgroundTaskResult | void;

/**
 * React Native background-task compatible schedule options.
 */
export interface ReactNativeBackgroundTaskOptions {
  /**
   * Desired seconds between each execution. Mapped to minimumInterval minutes.
   */
  period?: number;

  /**
   * Android-only timeout hint kept for API compatibility.
   */
  timeout?: number;
}

/**
 * React Native background-task compatible status payload.
 */
export interface ReactNativeBackgroundTaskStatus {
  /**
   * Whether background tasks are available to the app.
   */
  available: boolean;

  /**
   * Reason when unavailable.
   */
  unavailableReason?: string;
}

export interface GetStatusResult {
  status: BackgroundTaskStatus;
}

export interface BooleanResult {
  value: boolean;
}

export interface PendingTaskRunsResult {
  tasks: BackgroundTaskEvent[];
}

export interface RegisteredTasksResult {
  tasks: string[];
}

export interface FinishOptions {
  taskId: string;
  taskName?: string;
  result?: BackgroundTaskResult;
}

export interface RegisterTaskOptions {
  taskName: string;
  options?: BackgroundTaskOptions;
}

export interface TaskNameOptions {
  taskName: string;
}

export interface NativeBackgroundTaskPlugin {
  registerTask(options: RegisterTaskOptions): Promise<void>;
  unregisterTask(options: TaskNameOptions): Promise<void>;
  isTaskRegistered(options: TaskNameOptions): Promise<BooleanResult>;
  getRegisteredTasks(): Promise<RegisteredTasksResult>;
  getPendingTaskRuns(): Promise<PendingTaskRunsResult>;
  getStatus(): Promise<GetStatusResult>;
  triggerTaskWorkerForTesting(): Promise<BooleanResult>;
  finish(options: FinishOptions): Promise<void>;
  addListener(
    eventName: 'backgroundTask',
    listenerFunc: (event: BackgroundTaskEvent) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'expiration',
    listenerFunc: (event: BackgroundTaskEvent) => void,
  ): Promise<PluginListenerHandle>;
}

export interface BackgroundTaskPlugin {
  /**
   * Define the JavaScript callback for a task. Call this at module/global scope.
   */
  defineTask(taskName: string, callback: BackgroundTaskCallback): void;

  /**
   * Register a named periodic background task.
   */
  registerTaskAsync(taskName: string, options?: BackgroundTaskOptions): Promise<void>;

  /**
   * Unregister a named periodic background task.
   */
  unregisterTaskAsync(taskName: string): Promise<void>;

  /**
   * Check whether a named task is registered.
   */
  isTaskRegisteredAsync(taskName: string): Promise<boolean>;

  /**
   * Return all registered task names.
   */
  getRegisteredTasksAsync(): Promise<string[]>;

  /**
   * Return pending task runs that native recorded before JavaScript was ready.
   */
  getPendingTaskRunsAsync(): Promise<BackgroundTaskEvent[]>;

  /**
   * Return native background task availability.
   */
  getStatusAsync(): Promise<BackgroundTaskStatus>;

  /**
   * Trigger all registered tasks immediately for development/testing.
   */
  triggerTaskWorkerForTestingAsync(): Promise<boolean>;

  /**
   * Listen for iOS expiration callbacks.
   */
  addExpirationListener(listener: (event: BackgroundTaskEvent) => void): Promise<PluginListenerHandle>;

  /**
   * React Native background-task compatible single-task define helper.
   */
  define(callback: BackgroundTaskCallback): void;

  /**
   * React Native background-task compatible single-task scheduler.
   */
  schedule(options?: ReactNativeBackgroundTaskOptions): Promise<void>;

  /**
   * React Native background-task compatible single-task cancel helper.
   */
  cancel(): Promise<void>;

  /**
   * React Native background-task compatible status helper.
   */
  statusAsync(): Promise<ReactNativeBackgroundTaskStatus>;

  /**
   * React Native background-task compatible finish helper. Normal Expo-style
   * callbacks are finished automatically.
   */
  finish(result?: BackgroundTaskResult): Promise<void>;
}
