import { createRemoteJWKSet, jwtVerify } from "jose";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? "parallel-979e8";

// Google's public certs for Firebase Auth ID tokens (auto-cached + rotated).
const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

export interface FirebaseIdentity {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  const email = payload.email;
  if (typeof email !== "string" || !payload.sub) {
    throw new Error("Firebase account has no verified email");
  }

  return {
    uid: payload.sub,
    email: email.toLowerCase(),
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email.split("@")[0],
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
