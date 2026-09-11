# Quill Android build

Quill is a Next.js app with a Capacitor Android shell. The web app remains the source of truth for UI and backend behaviour; Capacitor packages that production app into a native Android container.

## Local build

1. Install dependencies.
2. Build the web app.
3. Sync Capacitor.
4. Open `android/` in Android Studio and build the APK.

The Capacitor config points the native shell at the production Quill URL so the APK uses the same live backend and account system.
