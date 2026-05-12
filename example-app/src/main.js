import './style.css';
import { BackgroundTask, BackgroundTaskResult, BackgroundTaskStatus } from '@capgo/capacitor-background-task';

const output = document.getElementById('plugin-output');
const taskNameInput = document.getElementById('task-name');
const registerButton = document.getElementById('register-task');
const triggerButton = document.getElementById('trigger-task');
const unregisterButton = document.getElementById('unregister-task');
const statusButton = document.getElementById('get-status');

const setOutput = (value) => {
  output.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
};

const getTaskName = () => taskNameInput.value.trim() || 'sync-offline-data';

BackgroundTask.defineTask(getTaskName(), async (event) => {
  setOutput({
    event,
    message: 'Background task callback executed.',
  });
  return BackgroundTaskResult.Success;
});

registerButton.addEventListener('click', async () => {
  try {
    const taskName = getTaskName();
    BackgroundTask.defineTask(taskName, async (event) => {
      setOutput({
        event,
        message: 'Background task callback executed.',
      });
      return BackgroundTaskResult.Success;
    });
    await BackgroundTask.registerTaskAsync(taskName, {
      minimumInterval: 15,
      requiresNetwork: true,
    });
    setOutput({ registered: taskName });
  } catch (error) {
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

triggerButton.addEventListener('click', async () => {
  try {
    const triggered = await BackgroundTask.triggerTaskWorkerForTestingAsync();
    setOutput({ triggered });
  } catch (error) {
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

unregisterButton.addEventListener('click', async () => {
  try {
    const taskName = getTaskName();
    await BackgroundTask.unregisterTaskAsync(taskName);
    setOutput({ unregistered: taskName });
  } catch (error) {
    setOutput(`Error: ${error?.message ?? error}`);
  }
});

statusButton.addEventListener('click', async () => {
  try {
    const status = await BackgroundTask.getStatusAsync();
    const tasks = await BackgroundTask.getRegisteredTasksAsync();
    setOutput({
      status,
      statusName: BackgroundTaskStatus[status],
      tasks,
    });
  } catch (error) {
    setOutput(`Error: ${error?.message ?? error}`);
  }
});
