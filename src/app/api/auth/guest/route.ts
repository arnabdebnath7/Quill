import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";

export async function POST() {
  try {
    const [user] = await db
      .insert(users)
      .values({
        email: `guest-${crypto.randomUUID()}@guest.quill.local`,
        name: "Guest Trader",
      })
      .returning();

    await createSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, name: user.name } });
  } catch (e) {
    console.error("[auth/guest] Guest session error:", e);
    return NextResponse.json(
      { error: "Quill could not open guest mode. Please try again." },
      { status: 500 }
    );
  }
}
