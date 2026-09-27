/**
 * Personal readiness — one formula for the Today page, Insights and Mimo.
 * Energy and focus are 1–5 scales; sleep hours are mapped onto the same 1–5
 * range (2 h per point, capped at 10 h). Missing inputs count as neutral (3).
 */
export type ReadinessInput = { energy?: number | null; focus?: number | null; sleepHours?: string | number | null } | null | undefined;

export function hasReadinessInputs(checkin: ReadinessInput) {
  return !!checkin && (checkin.energy != null || checkin.focus != null || (checkin.sleepHours != null && checkin.sleepHours !== ""));
}

export function readinessScore(checkin: ReadinessInput): number {
  const sleepRaw = checkin?.sleepHours == null || checkin.sleepHours === "" ? null : Number(checkin.sleepHours);
  const sleep = sleepRaw == null || !Number.isFinite(sleepRaw) ? 3 : Math.min(5, Math.max(1, sleepRaw / 2));
  const energy = checkin?.energy ?? 3;
  const focus = checkin?.focus ?? 3;
  return Math.round(((energy + focus + sleep) / 3 / 5) * 100);
}

export const READINESS_THRESHOLDS = { protect: 55, selective: 75 } as const;

export function readinessLabel(score: number) {
  if (score < READINESS_THRESHOLDS.protect) return "Protect capital";
  if (score < READINESS_THRESHOLDS.selective) return "Trade selectively";
  return "Normal execution";
}
