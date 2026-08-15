package com.lifeos.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** JSON reminder list in SharedPreferences + AlarmManager scheduling. */
public final class ReminderStore {
    private static final String PREFS = "lifeos_reminders";
    private static final String KEY = "reminders";
    private static final String ACTION = "com.lifeos.app.ALARM";
    private static final SimpleDateFormat FMT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US);

    private ReminderStore() {}

    public static String get(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]");
    }

    public static void set(Context c, String json) {
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply();
        scheduleAll(c);
    }

    public static void markFired(Context c, String id) {
        try {
            JSONArray a = new JSONArray(get(c));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                if (id.equals(o.optString("id"))) {
                    o.put("fired", true);
                    break;
                }
            }
            c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, a.toString()).apply();
        } catch (JSONException ignored) {}
    }

    public static void scheduleAll(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        try {
            JSONArray a = new JSONArray(get(c));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                String id = o.optString("id");
                boolean active = o.optBoolean("active", true);
                boolean done = o.optBoolean("done", false);
                boolean fired = o.optBoolean("fired", false);
                cancel(am, c, id);
                if (!active || done || fired) continue;
                Date d = FMT.parse(o.optString("at"));
                long t = d.getTime();
                if (t <= System.currentTimeMillis()) continue;
                Intent i2 = new Intent(c, AlarmReceiver.class)
                        .setAction(ACTION)
                        .putExtra("id", id)
                        .putExtra("title", o.optString("title"))
                        .putExtra("at", o.optString("at"));
                PendingIntent pi = PendingIntent.getBroadcast(c, id.hashCode(), i2,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                scheduleExact(am, pi, t);
            }
        } catch (JSONException | ParseException ignored) {}
    }

    private static void scheduleExact(AlarmManager am, PendingIntent pi, long t) {
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            am.set(AlarmManager.RTC_WAKEUP, t, pi); // inexact fallback
            return;
        }
        try {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t, pi);
        } catch (SecurityException e) {
            am.set(AlarmManager.RTC_WAKEUP, t, pi);
        }
    }

    private static void cancel(AlarmManager am, Context c, String id) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION);
        PendingIntent pi = PendingIntent.getBroadcast(c, id.hashCode(), i,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) am.cancel(pi);
    }
}
