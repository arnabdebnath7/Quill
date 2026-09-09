import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export const SESSION_COOKIE = "quill_session";
const SESSION_DAYS = 30;

/**
 * Auth seam: today the login flow provisions a local user from the Google
 * profile payload. When Firebase Auth keys arrive, verify the Firebase ID
 * token server-side (firebase-admin `verifyIdToken`) and map to the same
 * `users` row — no other code changes.
 */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

/** For API routes: returns the user or null (route decides the 401 shape). */
export async function requireUser(): Promise<User | null> {
  return getSessionUser();
}
