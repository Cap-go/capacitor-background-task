# @capgo/capacitor-background-task

<a href="https://capgo.app/"><img src="https://capgo.app/readme-banner.svg?repo=Cap-go/capacitor-background-task" alt="Capgo - Instant updates for Capacitor" /></a>

<div align="center">
  <h2><a href="https://capgo.app/?ref=plugin_background_task">Get instant updates for your app with Capgo</a></h2>
  <h2><a href="https://capgo.app/consulting/?ref=plugin_background_task">Need a plugin feature? We can build it</a></h2>
</div>

Periodic background task scheduling for Capacitor apps. It follows the practical feature set of Expo BackgroundTask: named tasks, persistent registration, status checks, unregistering, a testing trigger, and iOS expiration events.

## What It Does

- Schedules periodic background work on Android with WorkManager.
- Schedules background processing on iOS with BGTaskScheduler.
- Supports multiple named tasks with `minimumInterval` in minutes.
- Emits retained task events so task runs recorded before JavaScript is ready can be drained.
- Provides a small `react-native-background-task` compatible API: `define`, `schedule`, `cancel`, `statusAsync`, and `finish`.

## Limits

- Background tasks are not exact timers. Android and iOS decide when work actually runs.
- Android enforces a 15 minute minimum interval.
- iOS may delay runs substantially based on battery, network, and user behavior.
- iOS background tasks do not run in the simulator; use a physical device.
- This plugin cannot make an app run indefinitely in the background.

## Compatibility

| Plugin version | Capacitor compatibility | Maintained |
| -------------- | ----------------------- | ---------- |
| v8.\*.\*       | v8.\*.\*                | ✅          |
| v7.\*.\*       | v7.\*.\*                | On demand   |
| v6.\*.\*       | v6.\*.\*                | On demand   |

Policy:

- New plugins start at version `8.0.0` (Capacitor 8 baseline).
- Backward compatibility for older Capacitor majors is supported on demand.

## Install

```bash
npm install @capgo/capacitor-background-task
npx cap sync
```

## iOS Setup

Add the background processing mode and permitted task identifier to `ios/App/App/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>processing</string>
</array>
<key>BGTaskSchedulerPermittedIdentifiers</key>
<array>
  <string>app.capgo.backgroundtask.processing</string>
</array>
```

## Usage

Define tasks at module scope so they are available as soon as the app is started by the OS.

```typescript
import { BackgroundTask, BackgroundTaskResult } from '@capgo/capacitor-background-task';

const SYNC_TASK = 'sync-offline-data';

BackgroundTask.defineTask(SYNC_TASK, async () => {
  try {
    await fetch('https://example.com/sync', { method: 'POST' });
    return BackgroundTaskResult.Success;
  } catch {
    return BackgroundTaskResult.Failed;
  }
});

await BackgroundTask.registerTaskAsync(SYNC_TASK, {
  minimumInterval: 30,
  requiresNetwork: true,
});
```

## Testing

```typescript
await BackgroundTask.triggerTaskWorkerForTestingAsync();
```

## React Native Compatibility

```typescript
import { BackgroundTask } from '@capgo/capacitor-background-task';

BackgroundTask.define(async () => {
  await fetch('https://example.com/sync', { method: 'POST' });
});

await BackgroundTask.schedule({
  period: 1800,
});
```

## Example App

The `example-app/` folder is linked via `file:..` and is intended for validating native wiring during development.

## API

<docgen-index>

* [`defineTask(...)`](#definetask)
* [`registerTaskAsync(...)`](#registertaskasync)
* [`unregisterTaskAsync(...)`](#unregistertaskasync)
* [`isTaskRegisteredAsync(...)`](#istaskregisteredasync)
* [`getRegisteredTasksAsync()`](#getregisteredtasksasync)
* [`getPendingTaskRunsAsync()`](#getpendingtaskrunsasync)
* [`getStatusAsync()`](#getstatusasync)
* [`triggerTaskWorkerForTestingAsync()`](#triggertaskworkerfortestingasync)
* [`addExpirationListener(...)`](#addexpirationlistener)
* [`define(...)`](#define)
* [`schedule(...)`](#schedule)
* [`cancel()`](#cancel)
* [`statusAsync()`](#statusasync)
* [`finish(...)`](#finish)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)
* [Enums](#enums)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### defineTask(...)

```typescript
defineTask(taskName: string, callback: BackgroundTaskCallback) => void
```

Define the JavaScript callback for a task. Call this at module/global scope.

| Param          | Type                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| **`taskName`** | <code>string</code>                                                       |
| **`callback`** | <code><a href="#backgroundtaskcallback">BackgroundTaskCallback</a></code> |

--------------------


### registerTaskAsync(...)

```typescript
registerTaskAsync(taskName: string, options?: BackgroundTaskOptions | undefined) => Promise<void>
```

Register a named periodic background task.

| Param          | Type                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| **`taskName`** | <code>string</code>                                                     |
| **`options`**  | <code><a href="#backgroundtaskoptions">BackgroundTaskOptions</a></code> |

--------------------


### unregisterTaskAsync(...)

```typescript
unregisterTaskAsync(taskName: string) => Promise<void>
```

Unregister a named periodic background task.

| Param          | Type                |
| -------------- | ------------------- |
| **`taskName`** | <code>string</code> |

--------------------


### isTaskRegisteredAsync(...)

```typescript
isTaskRegisteredAsync(taskName: string) => Promise<boolean>
```

Check whether a named task is registered.

| Param          | Type                |
| -------------- | ------------------- |
| **`taskName`** | <code>string</code> |

**Returns:** <code>Promise&lt;boolean&gt;</code>

--------------------


### getRegisteredTasksAsync()

```typescript
getRegisteredTasksAsync() => Promise<string[]>
```

Return all registered task names.

**Returns:** <code>Promise&lt;string[]&gt;</code>

--------------------


### getPendingTaskRunsAsync()

```typescript
getPendingTaskRunsAsync() => Promise<BackgroundTaskEvent[]>
```

Return pending task runs that native recorded before JavaScript was ready.

**Returns:** <code>Promise&lt;BackgroundTaskEvent[]&gt;</code>

--------------------


### getStatusAsync()

```typescript
getStatusAsync() => Promise<BackgroundTaskStatus>
```

Return native background task availability.

**Returns:** <code>Promise&lt;<a href="#backgroundtaskstatus">BackgroundTaskStatus</a>&gt;</code>

--------------------


### triggerTaskWorkerForTestingAsync()

```typescript
triggerTaskWorkerForTestingAsync() => Promise<boolean>
```

Trigger all registered tasks immediately for development/testing.

**Returns:** <code>Promise&lt;boolean&gt;</code>

--------------------


### addExpirationListener(...)

```typescript
addExpirationListener(listener: (event: BackgroundTaskEvent) => void) => Promise<PluginListenerHandle>
```

Listen for iOS expiration callbacks.

| Param          | Type                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- |
| **`listener`** | <code>(event: <a href="#backgroundtaskevent">BackgroundTaskEvent</a>) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### define(...)

```typescript
define(callback: BackgroundTaskCallback) => void
```

React Native background-task compatible single-task define helper.

| Param          | Type                                                                      |
| -------------- | ------------------------------------------------------------------------- |
| **`callback`** | <code><a href="#backgroundtaskcallback">BackgroundTaskCallback</a></code> |

--------------------


### schedule(...)

```typescript
schedule(options?: ReactNativeBackgroundTaskOptions | undefined) => Promise<void>
```

React Native background-task compatible single-task scheduler.

| Param         | Type                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------- |
| **`options`** | <code><a href="#reactnativebackgroundtaskoptions">ReactNativeBackgroundTaskOptions</a></code> |

--------------------


### cancel()

```typescript
cancel() => Promise<void>
```

React Native background-task compatible single-task cancel helper.

--------------------


### statusAsync()

```typescript
statusAsync() => Promise<ReactNativeBackgroundTaskStatus>
```

React Native background-task compatible status helper.

**Returns:** <code>Promise&lt;<a href="#reactnativebackgroundtaskstatus">ReactNativeBackgroundTaskStatus</a>&gt;</code>

--------------------


### finish(...)

```typescript
finish(result?: BackgroundTaskResult | undefined) => Promise<void>
```

React Native background-task compatible finish helper. Normal Expo-style
callbacks are finished automatically.

| Param        | Type                                                                  |
| ------------ | --------------------------------------------------------------------- |
| **`result`** | <code><a href="#backgroundtaskresult">BackgroundTaskResult</a></code> |

--------------------


### Interfaces


#### BackgroundTaskEvent

Payload emitted when native scheduling asks JavaScript to run a task.

| Prop            | Type                 | Description                                                                                                 |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **`taskName`**  | <code>string</code>  | Name passed to registerTaskAsync.                                                                           |
| **`taskId`**    | <code>string</code>  | Native run identifier. The JavaScript wrapper finishes it automatically when the defined callback resolves. |
| **`timestamp`** | <code>number</code>  | Native timestamp for the run.                                                                               |
| **`test`**      | <code>boolean</code> | True when triggered through triggerTaskWorkerForTestingAsync.                                               |


#### BackgroundTaskOptions

Options for registering a periodic background task.

| Prop                  | Type                 | Description                                                                                                                                                                     |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`minimumInterval`** | <code>number</code>  | Inexact interval in minutes between task runs. Defaults to 720 minutes. Android enforces a 15 minute minimum. iOS treats this as an earliest begin date and may run much later. |
| **`requiresNetwork`** | <code>boolean</code> | Require an active network before running the native scheduler. Defaults to true.                                                                                                |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


#### ReactNativeBackgroundTaskOptions

React Native background-task compatible schedule options.

| Prop          | Type                | Description                                                                |
| ------------- | ------------------- | -------------------------------------------------------------------------- |
| **`period`**  | <code>number</code> | Desired seconds between each execution. Mapped to minimumInterval minutes. |
| **`timeout`** | <code>number</code> | Android-only timeout hint kept for API compatibility.                      |


#### ReactNativeBackgroundTaskStatus

React Native background-task compatible status payload.

| Prop                    | Type                 | Description                                        |
| ----------------------- | -------------------- | -------------------------------------------------- |
| **`available`**         | <code>boolean</code> | Whether background tasks are available to the app. |
| **`unavailableReason`** | <code>string</code>  | Reason when unavailable.                           |


### Type Aliases


#### BackgroundTaskCallback

Function executed for a background task.

<code>(event: <a href="#backgroundtaskevent">BackgroundTaskEvent</a>): void | <a href="#backgroundtaskresult">BackgroundTaskResult</a> | Promise&lt;void | <a href="#backgroundtaskresult">BackgroundTaskResult</a>&gt;</code>


### Enums


#### BackgroundTaskResult

| Members       | Value          | Description                     |
| ------------- | -------------- | ------------------------------- |
| **`Success`** | <code>1</code> | The task finished successfully. |
| **`Failed`**  | <code>2</code> | The task failed.                |


#### BackgroundTaskStatus

| Members          | Value          | Description                                              |
| ---------------- | -------------- | -------------------------------------------------------- |
| **`Restricted`** | <code>1</code> | Background task scheduling is unavailable or restricted. |
| **`Available`**  | <code>2</code> | Background task scheduling is available.                 |

</docgen-api>
