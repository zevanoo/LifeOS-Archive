# LifeOS (Android)

Super app offline pengatur hidup: catatan markdown, jurnal harian, tugas & deadline,
keuangan, pengingat. UI WebView (HTML/CSS/JS di `app/src/main/assets/www`) + alarm
native via `AlarmManager` — berbunyi walau app tertutup, tanpa background service.

## Build

Push ke `main` → GitHub Actions build otomatis → APK di artifact `lifeos-apk`.

Signing butuh 4 secrets (lihat workflow):
`LIFEO_KEYSTORE_B64` (base64 keystore), `LIFEO_STORE_PASS`, `LIFEO_KEY_ALIAS`, `LIFEO_KEY_PASS`.

## Instal

Download APK dari Actions → Install (izinkan "install from unknown sources").

## Struktur

- `app/src/main/assets/www/` — web app (source: PWA LifeOS + bridge `AndroidBridge`)
- `MainActivity.java` — WebView shell + `JavascriptInterface` (sync pengingat)
- `ReminderStore.java` — SharedPreferences JSON + jadwal `AlarmManager` (exact, fallback inexact)
- `AlarmReceiver.java` — notifikasi saat alarm berbunyi
- `BootReceiver.java` — reschedule setelah reboot
