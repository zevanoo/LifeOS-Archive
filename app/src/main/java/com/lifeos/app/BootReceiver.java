package com.lifeos.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Reschedule alarms after reboot (alarms don't survive reboot). */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            ReminderStore.scheduleAll(c);
        }
    }
}
