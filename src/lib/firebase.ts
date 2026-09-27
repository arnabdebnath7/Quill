import { getApp, getApps, initializeApp, FirebaseError } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase-config";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firebase remembers the signed-in user in IndexedDB. We only need the ID
// token for one server exchange, so the language of reCAPTCHA / SMS should
// follow the browser and nothing else needs configuring.
auth.useDeviceLanguage();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export class SignInCancelled extends Error {
  constructor() {
    super("cancelled");
    this.name = "SignInCancelled";
  }
}

export function isFirebaseError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError || (typeof error === "object" && error !== null && typeof (error as { code?: unknown }).code === "string" && String((error as { code: string }).code).startsWith("auth/"));
}

/** Starts Google sign-in in a popup. Resolves with a Firebase ID token for the server exchange. */
export async function signInWithGoogle(): Promise<string> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return await result.user.getIdToken();
  } catch (error) {
    if (isFirebaseError(error) && (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request")) {
      throw new SignInCancelled();
    }
    throw error;
  }
}

/**
 * Phone sign-in step 1: sends the SMS code.
 *
 * Firebase's invisible reCAPTCHA renders into a DOM element and refuses to
 * render twice into the same element ("reCAPTCHA has already been rendered").
 * Because the widget renders *before* Firebase talks to its backend, any
 * failure (bad number, quota, billing) used to poison every retry until the
 * page was reloaded. We therefore mount a brand-new child element inside the
 * host for every attempt and tear it down afterwards.
 */
export async function sendPhoneCode(host: HTMLElement, phoneE164: string): Promise<ConfirmationResult> {
  const container = document.createElement("div");
  container.className = "quill-recaptcha";
  host.appendChild(container);
  const verifier = new RecaptchaVerifier(auth, container, { size: "invisible" });
  try {
    await verifier.render();
    return await signInWithPhoneNumber(auth, phoneE164, verifier);
  } finally {
    try {
      verifier.clear();
    } catch {
      // Already disposed — nothing to do.
    }
    container.remove();
  }
}

/** Phone sign-in step 2: confirms the code and returns the Firebase ID token. */
export async function confirmPhoneCode(confirmation: ConfirmationResult, code: string): Promise<string> {
  const credential = await confirmation.confirm(code);
  return credential.user.getIdToken();
}

/** Drops the Firebase-side session so the next visit to /login starts clean. */
export async function signOutFirebase() {
  try {
    await signOut(auth);
  } catch {
    // Ignore — the server session is already gone, and Firebase state is only a convenience.
  }
}
