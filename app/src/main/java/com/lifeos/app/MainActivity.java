package com.lifeos.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlarmManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

/** WebView shell: LifeOS web app + native alarm bridge. */
public class MainActivity extends Activity {

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);

        web.addJavascriptInterface(this, "AndroidBridge");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView v, String url) {
                pushNativeState();
            }
        });
        web.loadUrl("file:///android_asset/www/index.html");
    }

    @JavascriptInterface
    public String getReminders() {
        return ReminderStore.get(this);
    }

    @JavascriptInterface
    public void pushReminders(String json) {
        ReminderStore.set(this, json);
    }

    /** Web theme sync: status + navigation bar follow app palette. */
    @JavascriptInterface
    public void setTheme(final String json) {
        runOnUiThread(() -> {
            try {
                JSONObject o = new JSONObject(json);
                int bg = Color.parseColor(o.optString("background", "#6750A4"));
                boolean dark = o.optBoolean("dark", false);
                getWindow().setStatusBarColor(bg);
                getWindow().setNavigationBarColor(bg);
                int flags = getWindow().getDecorView().getSystemUiVisibility();
                if (Build.VERSION.SDK_INT >= 23) {
                    if (dark) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    else flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
                if (Build.VERSION.SDK_INT >= 26) {
                    if (dark) flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    else flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                }
                getWindow().getDecorView().setSystemUiVisibility(flags);
            } catch (Exception ignored) {}
        });
    }

    /** Sync native reminder state (fired flags) into the web UI. */
    private void pushNativeState() {
        if (web == null) return;
        runOnUiThread(() -> web.evaluateJavascript(
                "window.LifeBridge && window.LifeBridge.setReminders(" +
                        JSONObject.quote(ReminderStore.get(this)) + ")",
                null));
    }

    @Override
    protected void onResume() {
        super.onResume();
        ensurePermissions();
        pushNativeState();
    }

    private void ensurePermissions() {
        if (Build.VERSION.SDK_INT >= 33 &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        if (Build.VERSION.SDK_INT >= 31 && Build.VERSION.SDK_INT < 33) {
            AlarmManager am = (AlarmManager) getSystemService(ALARM_SERVICE);
            if (am != null && !am.canScheduleExactAlarms()) {
                Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getPackageName()));
                try { startActivity(i); } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }
}
