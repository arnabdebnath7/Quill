import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { and, eq, gt, lt } from "drizzle-orm";

export const SESSION_COOKIE = "quill_session";
const SESSION_DAYS = 30;

/** Sessions are stored as a sha256 digest so a database leak cannot be replayed as a cookie. */
function digest(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token: digest(token), userId, expiresAt });
  // Opportunistic cleanup: expired rows are useless and only slow the lookup down.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => {});
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, digest(token)));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, digest(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

/** For API routes: returns the user or null (the route decides the 401 shape). */
export async function requireUser(): Promise<User | null> {
  return getSessionUser();
}
