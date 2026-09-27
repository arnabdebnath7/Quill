"use client";

import type { IntelligenceResult } from "@/lib/intelligence";
import type { MimoCoachOutput } from "@/lib/quill-agent";

export type Coach = MimoCoachOutput;

/** Error raised by the Mimo endpoints; `code` mirrors the server's machine-readable code when present. */
export class MimoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MimoError";
  }
}

/** IANA time zone of the browser, so server-side calendars line up with the user's day. */
export function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    const json = await res.json();
    return json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function messageFor(status: number, json: Record<string, unknown>, fallback: string) {
  const code = typeof json.code === "string" ? json.code : undefined;
  if (code === "AI_RATE_LIMITED" || status === 429) return "Mimo needs a short breather — try again in a minute.";
  if (code === "AI_NOT_CONFIGURED" || status === 503) return "Mimo's AI coaching isn't switched on for this deployment yet.";
  if (status === 401) return "Your session expired. Please sign in again.";
  return typeof json.error === "string" && json.error ? json.error : fallback;
}

export async function fetchIntelligence(): Promise<IntelligenceResult> {
  const tz = browserTimeZone();
  const res = await fetch(`/api/intelligence${tz ? `?tz=${encodeURIComponent(tz)}` : ""}`, { cache: "no-store" });
  const json = await readJson(res);
  if (!res.ok) throw new MimoError(messageFor(res.status, json, `Request failed (${res.status})`), res.status, typeof json.code === "string" ? json.code : undefined);
  return json.intelligence as IntelligenceResult;
}

export async function askMimo(question: string): Promise<Coach> {
  const res = await fetch("/api/intelligence/coach", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, tz: browserTimeZone() }),
  });
  const json = await readJson(res);
  if (!res.ok) throw new MimoError(messageFor(res.status, json, `Mimo is unavailable right now (${res.status}).`), res.status, typeof json.code === "string" ? json.code : undefined);
  return json.coach as Coach;
}
