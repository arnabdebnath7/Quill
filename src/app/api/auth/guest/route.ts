import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession } from "@/lib/auth";

const GUEST_COOKIE = "quill_guest_device";

/**
 * Private workspace (guest) sign-in.
 *
 * The browser gets a stable anonymous device id on first visit; every later
 * "use a private workspace" click maps back to the same local user instead of
 * creating a fresh one each time.
 */
export async function POST() {
  try {
    const jar = await cookies();
    let deviceId = jar.get(GUEST_COOKIE)?.value;
    if (!deviceId) {
      deviceId = randomUUID();
      jar.set(GUEST_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // a year — private workspaces should persist
      });
    }

    const email = `guest-${deviceId}@guest.quill.local`;
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = existing ?? (await db.insert(users).values({ email, name: "Private Trader" }).returning())[0];
    if (!user) throw new Error("could not provision guest user");

    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error("[auth/guest] error", error);
    return NextResponse.json(
      { error: "Quill could not open your private workspace. Please try again." },
      { status: 500 },
    );
  }
}
