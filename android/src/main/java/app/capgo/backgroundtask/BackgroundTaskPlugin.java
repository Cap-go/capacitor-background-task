package app.capgo.backgroundtask;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "BackgroundTask")
public class BackgroundTaskPlugin extends Plugin {

    private static WeakReference<BackgroundTaskPlugin> activePlugin = new WeakReference<>(null);
    private final BackgroundTask implementation = new BackgroundTask();

    @Override
    public void load() {
        activePlugin = new WeakReference<>(this);
        emitPendingRuns();
    }

    @PluginMethod
    public void registerTask(PluginCall call) {
        String taskName = call.getString("taskName");
        if (isBlank(taskName)) {
            call.reject("taskName is required");
            return;
        }

        JSObject options = call.getObject("options", new JSObject());
        int minimumInterval = options.optInt("minimumInterval", BackgroundTask.DEFAULT_MINIMUM_INTERVAL_MINUTES);
        boolean requiresNetwork = options.optBoolean("requiresNetwork", true);

        try {
            implementation.registerTask(getContext(), taskName, minimumInterval, requiresNetwork);
            call.resolve();
        } catch (JSONException exception) {
            call.reject("Unable to register background task", exception);
        }
    }

    @PluginMethod
    public void unregisterTask(PluginCall call) {
        String taskName = call.getString("taskName");
        if (isBlank(taskName)) {
            call.reject("taskName is required");
            return;
        }

        implementation.unregisterTask(getContext(), taskName);
        call.resolve();
    }

    @PluginMethod
    public void isTaskRegistered(PluginCall call) {
        String taskName = call.getString("taskName");
        if (isBlank(taskName)) {
            call.reject("taskName is required");
            return;
        }

        JSObject response = new JSObject();
        response.put("value", implementation.isTaskRegistered(getContext(), taskName));
        call.resolve(response);
    }

    @PluginMethod
    public void getRegisteredTasks(PluginCall call) {
        JSObject response = new JSObject();
        response.put("tasks", implementation.getRegisteredTasks(getContext()));
        call.resolve(response);
    }

    @PluginMethod
    public void getPendingTaskRuns(PluginCall call) {
        JSObject response = new JSObject();
        response.put("tasks", implementation.getPendingRuns(getContext()));
        call.resolve(response);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject response = new JSObject();
        response.put("status", implementation.getStatus());
        call.resolve(response);
    }

    @PluginMethod
    public void triggerTaskWorkerForTesting(PluginCall call) {
        JSObject response = new JSObject();
        response.put("value", implementation.triggerTaskWorkerForTesting(getContext()));
        call.resolve(response);
    }

    @PluginMethod
    public void finish(PluginCall call) {
        String taskId = call.getString("taskId");
        if (isBlank(taskId)) {
            call.reject("taskId is required");
            return;
        }

        implementation.finish(getContext(), taskId, call.getString("taskName"), call.getInt("result", BackgroundTask.RESULT_SUCCESS));
        call.resolve();
    }

    static void dispatchRun(JSObject run) {
        BackgroundTaskPlugin plugin = activePlugin.get();
        if (plugin != null) {
            plugin.notifyListeners("backgroundTask", run, true);
        }
    }

    private void emitPendingRuns() {
        JSArray pendingRuns = implementation.getPendingRuns(getContext());
        for (int index = 0; index < pendingRuns.length(); index++) {
            Object run = pendingRuns.opt(index);
            if (run instanceof JSObject) {
                notifyListeners("backgroundTask", (JSObject) run, true);
            } else if (run instanceof JSONObject) {
                notifyListeners("backgroundTask", BackgroundTask.toJSObject((JSONObject) run), true);
            }
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
