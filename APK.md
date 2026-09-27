# Quill Android build

Quill is a Next.js app with server-side API routes, so it cannot be exported to static files.
The Android app is therefore a thin [Capacitor](https://capacitorjs.com) shell that loads the
production deployment (`server.url` in `capacitor.config.json`) inside a native WebView. The web
app stays the single source of truth for UI, data and sign-in.

## One-time setup

```bash
npm install
npm install --save-dev @capacitor/cli @capacitor/core @capacitor/android
npx cap add android
```

`webDir` in `capacitor.config.json` points at `public/` only because Capacitor requires a local
directory; the shell never serves those files because `server.url` is set.

## Build the APK

```bash
npx cap sync android
npx cap open android      # opens Android Studio → Build → Build APK(s)
```

## Sign-in inside the APK

- Google sign-in uses a popup, which the Android WebView blocks. Phone OTP works as-is; if you want
  Google inside the shell, add `@capacitor-firebase/authentication` and call its native sign-in.
- The Firebase project must list the production domain (`quill-nine.vercel.app`) under
  **Authentication → Settings → Authorized domains**, otherwise reCAPTCHA for phone OTP fails.
- Phone OTP needs the Firebase **Blaze** plan and an SMS region policy that allows India (+91).
  See `README.md` → *Firebase setup*.
