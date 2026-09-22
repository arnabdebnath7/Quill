"use client";

import { getApp, getApps, initializeApp, FirebaseError } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber as firebaseSignInWithPhoneNumber,
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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

const appleProvider = new OAuthProvider("apple.com");
appleProvider.addScope("email");
appleProvider.addScope("name");

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

async function signInWithProvider(provider: GoogleAuthProvider | OAuthProvider): Promise<string> {
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
        return new Promise<string>(() => {});
      }
      if (e.code === "auth/popup-closed-by-user") throw new SignInCancelled();
    }
    throw e;
  }
}

/** Starts Google sign-in. Returns a Firebase ID token for the server exchange. */
export function signInWithGoogle(): Promise<string> {
  return signInWithProvider(googleProvider);
}

/** Starts Apple sign-in. Returns a Firebase ID token for the server exchange. */
export function signInWithApple(): Promise<string> {
  return signInWithProvider(appleProvider);
}

/**
 * Creates Firebase's standard invisible reCAPTCHA verifier.
 *
 * Do not call initializeRecaptchaConfig() here: that is the project-level
 * reCAPTCHA Enterprise configuration path and is optional for the classic
 * Firebase Phone Auth flow. Calling it can fail with "recaptcha key
 * undefined" on projects that have not configured Enterprise.
 */
export function createPhoneRecaptchaVerifier(
  buttonId: string
): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, buttonId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {},
  });
}

export function sendPhoneVerificationCode(
  phoneNumber: string,
  appVerifier: RecaptchaVerifier
) {
  return firebaseSignInWithPhoneNumber(auth, phoneNumber, appVerifier);
}

export async function consumeRedirectResult(): Promise<string | null> {
  const res = await getRedirectResult(auth);
  if (!res) return null;
  return res.user.getIdToken();
}
