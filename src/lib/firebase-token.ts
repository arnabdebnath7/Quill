import { createRemoteJWKSet, errors as joseErrors, jwtVerify } from "jose";
import { FIREBASE_PROJECT_ID } from "@/lib/firebase-config";

const ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const JWKS_URL = new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");

// jose caches the key set and refreshes it automatically when an unknown `kid` shows up.
const jwks = createRemoteJWKSet(JWKS_URL);

export type FirebaseIdentity = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phone: string | null;
  name: string | null;
  picture: string | null;
  /** `google.com`, `phone`, `password`, … */
  provider: string | null;
};

export class InvalidFirebaseToken extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidFirebaseToken";
  }
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Verifies a Firebase ID token following the documented rules for third-party
 * verification (RS256, issuer/audience pinned to the project, non-empty `sub`,
 * `auth_time` in the past). Throws `InvalidFirebaseToken` on any failure so the
 * route can answer 401 instead of 500.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  let payload;
  try {
    ({ payload } = await jwtVerify(idToken, jwks, {
      issuer: ISSUER,
      audience: FIREBASE_PROJECT_ID,
      algorithms: ["RS256"],
      clockTolerance: 60,
    }));
  } catch (error) {
    // A timeout fetching Google's key set is an outage on our side, not a bad token → let the route answer 503.
    if (error instanceof joseErrors.JOSEError && error.code !== "ERR_JWKS_TIMEOUT") {
      throw new InvalidFirebaseToken(error.code);
    }
    throw error;
  }

  const uid = str(payload.sub);
  if (!uid || uid.length > 128) throw new InvalidFirebaseToken("ERR_FIREBASE_SUB");
  const authTime = typeof payload.auth_time === "number" ? payload.auth_time : null;
  if (authTime == null || authTime > Date.now() / 1000 + 60) throw new InvalidFirebaseToken("ERR_FIREBASE_AUTH_TIME");

  const firebaseClaims = (payload.firebase ?? null) as { sign_in_provider?: unknown } | null;
  return {
    uid,
    email: str(payload.email)?.toLowerCase() ?? null,
    emailVerified: payload.email_verified === true,
    phone: str(payload.phone_number),
    name: str(payload.name),
    picture: str(payload.picture),
    provider: str(firebaseClaims?.sign_in_provider),
  };
}
