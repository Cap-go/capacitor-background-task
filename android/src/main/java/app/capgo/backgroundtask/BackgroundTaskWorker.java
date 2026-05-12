package app.capgo.backgroundtask;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class BackgroundTaskWorker extends Worker {

    public BackgroundTaskWorker(@NonNull Context context, @NonNull WorkerParameters workerParameters) {
        super(context, workerParameters);
    }

    @NonNull
    @Override
    public Result doWork() {
        String taskName = getInputData().getString(BackgroundTask.EXTRA_TASK_NAME);
        if (taskName == null || taskName.trim().isEmpty()) {
            return Result.failure();
        }

        BackgroundTask.recordAndDispatchRun(getApplicationContext(), taskName, false);
        return Result.success();
    }
}
