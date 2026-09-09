import type { DailyCheckin, JournalEntry, Trade } from "@/db/schema";

type SignalTone = "positive" | "caution" | "neutral";

export type IntelligenceEvidence = {
  label: string;
  value: string;
  detail: string;
  tone?: SignalTone;
};

export type IntelligenceResult = {
  generatedAt: string;
  confidence: "early" | "building" | "strong";
  sampleSize: { trades: number; checkins: number; journals: number };
  readiness: { score: number | null; label: string; mood: string | null; energy: number | null; focus: number | null; sleepHours: number | null };
  weekly: { pnl: number; trades: number; winRate: number | null; previousPnl: number; deltaPnl: number | null; journalEntries: number };
  observations: IntelligenceEvidence[];
  edge: IntelligenceEvidence[];
  risks: IntelligenceEvidence[];
  nextActions: string[];
};

function pnlOfTrade(trade: Trade) {
  if (!trade.exitPrice) return null;
  const qty = Number(trade.quantity), entry = Number(trade.entryPrice), exit = Number(trade.exitPrice), fees = Number(trade.fees ?? 0);
  if (![qty, entry, exit, fees].every(Number.isFinite)) return null;
  return (trade.side === "short" ? entry - exit : exit - entry) * qty - fees;
}

function average(values: number[]) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }

function readinessFromCheckin(checkin: DailyCheckin | null) {
  if (!checkin) return { score: null, label: "No check-in yet", mood: null, energy: null, focus: null, sleepHours: null };
  const energy = checkin.energy ?? null, focus = checkin.focus ?? null, sleepHours = checkin.sleepHours == null ? null : Number(checkin.sleepHours);
  const parts = [energy, focus, sleepHours == null ? null : Math.min(8, Math.max(0, sleepHours)) * 12.5].filter((v): v is number => v != null);
  const score = parts.length ? Math.round(average(parts) ?? 0) : null;
  const label = score == null ? "Checked in" : score >= 80 ? "High readiness" : score >= 60 ? "Steady readiness" : score >= 40 ? "Caution" : "Protect capital";
  return { score, label, mood: checkin.mood, energy, focus, sleepHours };
}

function pct(value: number | null) { return value == null ? "—" : `${Math.round(value)}%`; }

export function buildIntelligence(input: { trades: Trade[]; checkins: DailyCheckin[]; journals: JournalEntry[] }): IntelligenceResult {
  const now = new Date();
  const recentCutoff = new Date(now); recentCutoff.setDate(recentCutoff.getDate() - 7);
  const prevCutoff = new Date(now); prevCutoff.setDate(prevCutoff.getDate() - 14);
  const closed = input.trades.map((trade) => ({ trade, pnl: pnlOfTrade(trade) })).filter((x): x is { trade: Trade; pnl: number } => x.pnl != null && x.trade.status === "closed");
  const recent = closed.filter(({ trade }) => new Date(trade.exitAt ?? trade.entryAt) >= recentCutoff);
  const previous = closed.filter(({ trade }) => { const date = new Date(trade.exitAt ?? trade.entryAt); return date >= prevCutoff && date < recentCutoff; });
  const recentPnl = recent.reduce((sum, x) => sum + x.pnl, 0), previousPnl = previous.reduce((sum, x) => sum + x.pnl, 0);
  const wins = recent.filter((x) => x.pnl > 0).length, winRate = recent.length ? (wins / recent.length) * 100 : null;
  const latestCheckin = [...input.checkins].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const readiness = readinessFromCheckin(latestCheckin);

  const bySetup = new Map<string, { pnl: number; count: number; wins: number }>();
  for (const x of closed) {
    const key = x.trade.setup?.trim() || "Unspecified setup", row = bySetup.get(key) ?? { pnl: 0, count: 0, wins: 0 };
    row.pnl += x.pnl; row.count += 1; if (x.pnl > 0) row.wins += 1; bySetup.set(key, row);
  }
  const strongestSetup = [...bySetup.entries()].filter(([, v]) => v.count >= 3).sort((a, b) => b[1].pnl - a[1].pnl)[0];

  const lowReadinessDates = new Set(input.checkins.filter((c) => { const score = readinessFromCheckin(c).score; return score != null && score < 50; }).map((c) => c.date));
  const lowReadinessTrades = closed.filter(({ trade }) => lowReadinessDates.has(new Date(trade.entryAt).toISOString().slice(0, 10)));
  const lowReadinessLossRate = lowReadinessTrades.length ? (lowReadinessTrades.filter((x) => x.pnl <= 0).length / lowReadinessTrades.length) * 100 : null;
  const rulesTrades = closed.filter(({ trade }) => trade.rulesFollowed != null), ruleBreaks = rulesTrades.filter(({ trade }) => trade.rulesFollowed === false), followedRules = rulesTrades.filter(({ trade }) => trade.rulesFollowed === true);
  const ruleBreakLossRate = ruleBreaks.length ? (ruleBreaks.filter((x) => x.pnl <= 0).length / ruleBreaks.length) * 100 : null;
  const normalRuleLossRate = followedRules.length ? (followedRules.filter((x) => x.pnl <= 0).length / followedRules.length) * 100 : null;

  const observations: IntelligenceEvidence[] = [{ label: "Weekly tape", value: `${recent.length} closed trades`, detail: `${recentPnl >= 0 ? "+" : ""}${recentPnl.toFixed(2)} P&L over the last 7 days`, tone: recentPnl >= 0 ? "positive" : "caution" }];
  const edge: IntelligenceEvidence[] = [], risks: IntelligenceEvidence[] = [];
  if (readiness.score != null) observations.push({ label: "Today's state", value: `${readiness.score}/100`, detail: `${readiness.label}${readiness.mood ? ` · ${readiness.mood}` : ""}`, tone: readiness.score >= 60 ? "positive" : "caution" });
  if (recent.length >= 3 && previous.length >= 3) observations.push({ label: "Week over week", value: `${recentPnl - previousPnl >= 0 ? "+" : ""}${(recentPnl - previousPnl).toFixed(2)}`, detail: "Difference versus the previous 7-day window" });
  if (strongestSetup) { const [name, stats] = strongestSetup, expectancy = stats.pnl / stats.count; edge.push({ label: "Best documented setup", value: name, detail: `${stats.count} trades · ${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)} average P&L · ${pct((stats.wins / stats.count) * 100)} wins`, tone: expectancy > 0 ? "positive" : "neutral" }); }
  const avgRecent = average(recent.map((x) => x.pnl));
  if (avgRecent != null) edge.push({ label: "Recent expectancy", value: `${avgRecent >= 0 ? "+" : ""}${avgRecent.toFixed(2)}`, detail: "Average realized P&L across closed trades in the last 7 days", tone: avgRecent > 0 ? "positive" : "caution" });
  if (lowReadinessTrades.length >= 3 && lowReadinessLossRate != null) risks.push({ label: "Low-readiness pattern", value: `${pct(lowReadinessLossRate)} loss rate`, detail: `${lowReadinessTrades.length} trades entered on low-readiness days. Treat as a review signal, not a prediction.`, tone: lowReadinessLossRate >= 60 ? "caution" : "neutral" });
  if (ruleBreaks.length >= 2 && ruleBreakLossRate != null) { const detail = normalRuleLossRate == null ? `${ruleBreaks.length} rule-break trades logged` : `${pct(ruleBreakLossRate)} loss rate vs ${pct(normalRuleLossRate)} when rules were followed`; risks.push({ label: "Rule adherence", value: `${ruleBreaks.length} breaks`, detail, tone: ruleBreakLossRate > (normalRuleLossRate ?? 50) ? "caution" : "neutral" }); }
  if (recent.length && recent.every((x) => x.pnl < 0)) risks.push({ label: "Current streak", value: `${recent.length} losses`, detail: "Protect the process: review sizing, readiness and rule adherence before adding complexity.", tone: "caution" });

  const nextActions: string[] = [];
  if (readiness.score != null && readiness.score < 60) nextActions.push("Run the Today check-in before opening a new position.");
  if (ruleBreaks.length >= 2) nextActions.push("Review the last rule-break trades and write one concrete prevention rule.");
  if (strongestSetup && strongestSetup[1].pnl > 0) nextActions.push(`Tag more trades consistently so Quill can test whether “${strongestSetup[0]}” remains your strongest documented setup.`);
  if (!nextActions.length) nextActions.push("Keep logging pre-trade plans and post-trade reviews; Quill gets materially sharper as your evidence grows.");
  const confidence: IntelligenceResult["confidence"] = closed.length >= 30 && input.checkins.length >= 14 ? "strong" : closed.length >= 10 && input.checkins.length >= 5 ? "building" : "early";
  return { generatedAt: now.toISOString(), confidence, sampleSize: { trades: closed.length, checkins: input.checkins.length, journals: input.journals.length }, readiness, weekly: { pnl: recentPnl, trades: recent.length, winRate, previousPnl, deltaPnl: recent.length && previous.length ? recentPnl - previousPnl : null, journalEntries: input.journals.filter((j) => new Date(j.createdAt) >= recentCutoff).length }, observations, edge, risks, nextActions };
}
