package com.lifeos.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    public static final String CHANNEL = "alarm";

    @Override
    public void onReceive(Context c, Intent intent) {
        String id = intent.getStringExtra("id");
        String title = intent.getStringExtra("title");
        String at = intent.getStringExtra("at");
        if (id != null) ReminderStore.markFired(c, id);

        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CHANNEL, "Pengingat",
                    NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alarm kegiatan LifeOS");
            nm.createNotificationChannel(ch);
        }

        Intent open = new Intent(c, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new Notification.Builder(c, CHANNEL)
                : new Notification.Builder(c);
        Notification n = b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle("⏰ " + title)
                .setContentText("Waktunya: " + at)
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
                .setVibrate(new long[]{0, 600, 300, 600})
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(Notification.PRIORITY_HIGH)
                .build();
        nm.notify(id == null ? 1 : id.hashCode(), n);
    }
}
