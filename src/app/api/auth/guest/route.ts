import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
export async function POST(){try{const [user]=await db.insert(users).values({email:`guest-${crypto.randomUUID()}@guest.quill.local`,name:"Private Trader"}).returning();await createSession(user.id);return NextResponse.json({ok:true,user:{id:user.id,name:user.name}})}catch(error){console.error("[auth/guest] error",error);return NextResponse.json({error:"Quill could not open your private workspace. Please try again."},{status:500})}}
