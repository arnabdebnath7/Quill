"use client";

import { getApp, getApps, initializeApp, FirebaseError } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithRedirect,
} from "firebase/auth";

// Firebase web config is public by design — security lives in Firebase
// Auth rules + server-side ID-token verification, not in hiding these values.
const firebaseConfig = {
  apiKey: "AIzaSyBN51FLSMLwU9jr5WFy2zS3dXIRS0bSzmc",
  authDomain: "parallel-979e8.firebaseapp.com",
  projectId: "parallel-979e8",
  storageBucket: "parallel-979e8.firebasestorage.app",
  messagingSenderId: "818522675776",
  appId: "1:818522675776:web:34179d2bff5ee212da1da5",
  measurementId: "G-JD54J9D1M8",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Analytics only where it can actually run.
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => isSupported().then((ok) => ok && getAnalytics(app)))
    .catch(() => {});
}

export class SignInCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SignInCancelled";
  }
}

/**
 * Starts Google sign-in. Returns a Firebase ID token for the server exchange.
 * Falls back to a full-page redirect when popups are unavailable (embedded
 * browsers, some WebViews, popup blockers).
 */
export async function signInWithGoogle(): Promise<string> {
  try {
    const res = await signInWithPopup(auth, provider);
    return await res.user.getIdToken();
  } catch (e) {
    if (e instanceof FirebaseError) {
      if (
        e.code === "auth/popup-blocked" ||
        e.code === "auth/cancelled-popup-request" ||
        e.code === "auth/operation-not-supported-in-this-environment" ||
        e.code === "auth/web-storage-unsupported"
      ) {
        await signInWithRedirect(auth, provider);
        // Control never returns here — the page navigates away.
        return new Promise<string>(() => {});
      }
      if (e.code === "auth/popup-closed-by-user") throw new SignInCancelled();
    }
    throw e;
  }
}

/** Completes a redirect-based sign-in after the round trip to Google. */
export async function consumeRedirectResult(): Promise<string | null> {
  const res = await getRedirectResult(auth);
  if (!res) return null;
  return res.user.getIdToken();
}
