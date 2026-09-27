/**
 * Firebase web config. These values are public by design — the security
 * boundary is Firebase Auth itself plus the server-side ID-token verification
 * in `firebase-token.ts`, not secrecy of the config.
 *
 * Shared by the browser SDK and the server verifier so the project id can
 * never drift between the two (a mismatch makes every login fail with 401).
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBN51FLSMLwU9jr5WFy2zS3dXIRS0bSzmc",
  authDomain: "parallel-979e8.firebaseapp.com",
  projectId: "parallel-979e8",
  storageBucket: "parallel-979e8.firebasestorage.app",
  messagingSenderId: "818522675776",
  appId: "1:818522675776:web:34179d2bff5ee212da1da5",
  measurementId: "G-JD54J9D1M8",
} as const;

export const FIREBASE_PROJECT_ID: string =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || firebaseConfig.projectId;
