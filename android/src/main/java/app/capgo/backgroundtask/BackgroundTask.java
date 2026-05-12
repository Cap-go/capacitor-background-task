package app.capgo.backgroundtask;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.work.Configuration;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class BackgroundTask {

    static final String EXTRA_TASK_NAME = "taskName";
    static final int STATUS_RESTRICTED = 1;
    static final int STATUS_AVAILABLE = 2;
    static final int RESULT_SUCCESS = 1;
    static final int DEFAULT_MINIMUM_INTERVAL_MINUTES = 12 * 60;
    static final int MINIMUM_INTERVAL_MINUTES = 15;

    private static final String PREFS_NAME = "CapgoBackgroundTask";
    private static final String KEY_TASK_NAMES = "taskNames";
    private static final String KEY_TASK_PREFIX = "task.";
    private static final String KEY_PENDING_RUNS = "pendingRuns";
    private static final String KEY_LAST_RESULT_PREFIX = "lastResult.";
    private static final String WORK_TAG = "capgo_background_task";
    private static volatile boolean workManagerInitialized = false;

    public void registerTask(Context context, String taskName, int minimumInterval, boolean requiresNetwork) throws JSONException {
        int normalizedInterval = normalizeInterval(minimumInterval);
        JSONObject config = new JSONObject();
        config.put("taskName", taskName);
        config.put("minimumInterval", normalizedInterval);
        config.put("requiresNetwork", requiresNetwork);

        Set<String> taskNames = getTaskNames(context);
        taskNames.add(taskName);
        prefs(context).edit().putStringSet(KEY_TASK_NAMES, taskNames).putString(KEY_TASK_PREFIX + taskName, config.toString()).apply();

        scheduleTask(context, taskName, normalizedInterval, requiresNetwork);
    }

    public void unregisterTask(Context context, String taskName) {
        Set<String> taskNames = getTaskNames(context);
        taskNames.remove(taskName);
        prefs(context).edit().putStringSet(KEY_TASK_NAMES, taskNames).remove(KEY_TASK_PREFIX + taskName).apply();
        initializeWorkManager(context);
        WorkManager.getInstance(context).cancelUniqueWork(uniqueWorkName(taskName));
    }

    public boolean isTaskRegistered(Context context, String taskName) {
        return getTaskNames(context).contains(taskName);
    }

    public JSArray getRegisteredTasks(Context context) {
        JSArray tasks = new JSArray();
        for (String taskName : getTaskNames(context)) {
            tasks.put(taskName);
        }
        return tasks;
    }

    public JSArray getPendingRuns(Context context) {
        return toJSArray(readPendingRuns(context));
    }

    public int getStatus() {
        return STATUS_AVAILABLE;
    }

    public boolean triggerTaskWorkerForTesting(Context context) {
        boolean triggered = false;
        for (String taskName : getTaskNames(context)) {
            recordAndDispatchRun(context, taskName, true);
            triggered = true;
        }
        return triggered;
    }

    public void finish(Context context, String taskId, String taskName, int result) {
        removePendingRun(context, taskId);
        if (taskName != null && !taskName.isEmpty()) {
            prefs(context).edit().putInt(KEY_LAST_RESULT_PREFIX + taskName, result).apply();
        }
    }

    static void recordAndDispatchRun(Context context, String taskName, boolean isTest) {
        JSObject run = new JSObject();
        long timestamp = System.currentTimeMillis();
        String taskId = UUID.randomUUID().toString();

        run.put("taskName", taskName);
        run.put("taskId", taskId);
        run.put("timestamp", timestamp);
        run.put("test", isTest);

        addPendingRun(context, run);
        BackgroundTaskPlugin.dispatchRun(run);
    }

    private void scheduleTask(Context context, String taskName, int minimumInterval, boolean requiresNetwork) {
        initializeWorkManager(context);

        Constraints.Builder constraintsBuilder = new Constraints.Builder();
        constraintsBuilder.setRequiredNetworkType(requiresNetwork ? NetworkType.CONNECTED : NetworkType.NOT_REQUIRED);

        Data inputData = new Data.Builder().putString(EXTRA_TASK_NAME, taskName).build();
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
            BackgroundTaskWorker.class,
            normalizeInterval(minimumInterval),
            TimeUnit.MINUTES
        )
            .setInputData(inputData)
            .setConstraints(constraintsBuilder.build())
            .addTag(WORK_TAG)
            .addTag(uniqueWorkName(taskName))
            .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            uniqueWorkName(taskName),
            ExistingPeriodicWorkPolicy.UPDATE,
            workRequest
        );
    }

    private static synchronized void initializeWorkManager(Context context) {
        if (workManagerInitialized) {
            return;
        }

        try {
            Configuration config = new Configuration.Builder().setMinimumLoggingLevel(android.util.Log.INFO).build();
            WorkManager.initialize(context.getApplicationContext(), config);
        } catch (IllegalStateException exception) {
            Logger.debug("BackgroundTask WorkManager already initialized");
        }

        workManagerInitialized = true;
    }

    private static int normalizeInterval(int minimumInterval) {
        if (minimumInterval <= 0) {
            return DEFAULT_MINIMUM_INTERVAL_MINUTES;
        }
        return Math.max(MINIMUM_INTERVAL_MINUTES, minimumInterval);
    }

    private static String uniqueWorkName(String taskName) {
        return WORK_TAG + "." + taskName;
    }

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static Set<String> getTaskNames(Context context) {
        return new HashSet<>(prefs(context).getStringSet(KEY_TASK_NAMES, new HashSet<>()));
    }

    private static synchronized void addPendingRun(Context context, JSObject run) {
        JSONArray runs = readPendingRuns(context);
        runs.put(run);
        prefs(context).edit().putString(KEY_PENDING_RUNS, runs.toString()).apply();
    }

    private static synchronized void removePendingRun(Context context, String taskId) {
        JSONArray runs = readPendingRuns(context);
        JSONArray nextRuns = new JSONArray();

        for (int index = 0; index < runs.length(); index++) {
            JSONObject run = runs.optJSONObject(index);
            if (run == null || taskId.equals(run.optString("taskId"))) {
                continue;
            }
            nextRuns.put(run);
        }

        prefs(context).edit().putString(KEY_PENDING_RUNS, nextRuns.toString()).apply();
    }

    private static JSONArray readPendingRuns(Context context) {
        String rawRuns = prefs(context).getString(KEY_PENDING_RUNS, "[]");
        try {
            return new JSONArray(rawRuns);
        } catch (JSONException exception) {
            return new JSONArray();
        }
    }

    private static JSArray toJSArray(JSONArray array) {
        JSArray result = new JSArray();
        for (int index = 0; index < array.length(); index++) {
            Object value = array.opt(index);
            if (value instanceof JSONObject) {
                result.put(toJSObject((JSONObject) value));
            } else {
                result.put(value);
            }
        }
        return result;
    }

    static JSObject toJSObject(JSONObject object) {
        JSObject result = new JSObject();
        Iterator<String> keys = object.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            result.put(key, object.opt(key));
        }
        return result;
    }
}
