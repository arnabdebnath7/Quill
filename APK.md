# Getting the Quill APK

Two paths. Path A needs zero tooling. Path B gives you a native wrapper you own.

---

## Path A — PWABuilder (no Android SDK, ~5 minutes)

Quill is already a full PWA (manifest, icons, standalone display), so the
fastest route to a signed APK/AAB is Microsoft's PWABuilder:

1. Deploy Quill to a public URL (the preview URL works).
2. Go to **https://www.pwabuilder.com** and paste the URL → **Start**.
3. Click **Package for Android** → **Download**.
   - It generates both a **debug `.apk`** (sideload to any phone) and a
     **Play-ready `.aab`** with a TWA (Trusted Web Activity) wrapper.
4. Transfers run in a full Chrome Custom Tab, so **Firebase Google sign-in
   works exactly like the browser** — no extra config.

One step on your side: add your deployed domain to
**Firebase Console → Authentication → Settings → Authorized domains**.

---

## Path B — Capacitor native wrapper (needs JDK 17 + Android Studio)

This repo already ships `capacitor.config.json` pointed at the live server.

```bash
npm install -D @capacitor/cli @capacitor/core @capacitor/android
npx cap add android
npx cap sync
npx cap open android   # opens Android Studio
```

Then in Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.

Notes for the native shell:

- `capacitor.config.json` → `server.url` points the WebView at the deployed
  app, so it always serves the latest build (no OTA updates needed).
- Google sign-in inside the WebView automatically falls back to the
  **redirect flow** (already implemented in `src/lib/firebase.ts`).
  Add `capacitor://localhost` and your deployed domain to Firebase's
  Authorized domains.
- For Google Play's "Digital Asset Links" (hides the URL bar entirely),
  upload your signing SHA-256 to an `assetlinks.json` at
  `/.well-known/assetlinks.json` — PWABuilder does this for you in Path A.

Both paths produce a real installable `.apk` from this codebase as-is.
