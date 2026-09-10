import type { DailyCheckin, JournalEntry, Trade } from "@/db/schema";

type SignalTone = "positive" | "caution" | "neutral";
type EvidenceStrength = "insufficient" | "emerging" | "useful";

export type IntelligenceEvidence = {
  label: string;
  value: string;
  detail: string;
  tone?: SignalTone;
  sampleSize?: number;
  strength?: EvidenceStrength;
};

export type IntelligenceCorrelation = {
  label: string;
  headline: string;
  detail: string;
  higher: string;
  lower: string;
  sampleSize: number;
  tone: SignalTone;
  strength: EvidenceStrength;
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
  correlations: IntelligenceCorrelation[];
  nextActions: string[];
};

function pnlOfTrade(trade: Trade) {
  if (!trade.exitPrice) return null;
  const qty = Number(trade.quantity), entry = Number(trade.entryPrice), exit = Number(trade.exitPrice), fees = Number(trade.fees ?? 0);
  if (![qty, entry, exit, fees].every(Number.isFinite)) return null;
  return (trade.side === "short" ? entry - exit : exit - entry) * qty - fees;
}

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function pct(value: number | null) {
  return value == null ? "—" : `${Math.round(value)}%`;
}

function readinessFromCheckin(checkin: DailyCheckin | null) {
  if (!checkin) return { score: null, label: "No check-in yet", mood: null, energy: null, focus: null, sleepHours: null };
  const energy = checkin.energy ?? null;
  const focus = checkin.focus ?? null;
  const sleepHours = checkin.sleepHours == null ? null : Number(checkin.sleepHours);
  const parts = [energy, focus, sleepHours == null ? null : Math.min(8, Math.max(0, sleepHours)) * 12.5].filter((v): v is number => v != null);
  const score = parts.length ? Math.round(average(parts) ?? 0) : null;
  const label = score == null ? "Checked in" : score >= 80 ? "High readiness" : score >= 60 ? "Steady readiness" : score >= 40 ? "Caution" : "Protect capital";
  return { score, label, mood: checkin.mood, energy, focus, sleepHours };
}

function localDateKey(value: Date | string | number) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function evidenceStrength(sampleSize: number): EvidenceStrength {
  if (sampleSize >= 8) return "useful";
  if (sampleSize >= 4) return "emerging";
  return "insufficient";
}

function splitMetricEvidence(
  label: string,
  metricLabel: string,
  rows: Array<{ metric: number; pnl: number }>,
): IntelligenceCorrelation | null {
  if (rows.length < 8) return null;
  const sorted = [...rows].sort((a, b) => a.metric - b.metric);
  const midpoint = sorted[Math.floor(sorted.length / 2)].metric;
  const low = sorted.filter((row) => row.metric <= midpoint);
  const high = sorted.filter((row) => row.metric > midpoint);
  if (low.length < 4 || high.length < 4) return null;

  const lowAvg = average(low.map((row) => row.pnl)) ?? 0;
  const highAvg = average(high.map((row) => row.pnl)) ?? 0;
  const winner = highAvg >= lowAvg ? { high: highAvg, low: lowAvg } : { high: lowAvg, low: highAvg };
  const direction = highAvg >= lowAvg ? "higher" : "lower";
  const difference = Math.abs(highAvg - lowAvg);
  const tone: SignalTone = direction === "higher" ? "positive" : "caution";

  return {
    label,
    headline: `${metricLabel} lines up with ${direction} average P&L`,
    detail: `${high.length} trades above the midpoint averaged ${winner.high >= 0 ? "+" : ""}${winner.high.toFixed(2)}, versus ${low.length} at or below it averaging ${winner.low >= 0 ? "+" : ""}${winner.low.toFixed(2)}. Difference: ${difference.toFixed(2)}.`,
    higher: `${metricLabel} above ${Number(midpoint.toFixed(1))}`,
    lower: `${metricLabel} at or below ${Number(midpoint.toFixed(1))}`,
    sampleSize: rows.length,
    tone,
    strength: evidenceStrength(rows.length),
  };
}

function setupEvidence(closed: Array<{ trade: Trade; pnl: number }>): IntelligenceEvidence[] {
  const bySetup = new Map<string, { pnl: number; count: number; wins: number }>();
  for (const x of closed) {
    const key = x.trade.setup?.trim() || "Unspecified setup";
    const row = bySetup.get(key) ?? { pnl: 0, count: 0, wins: 0 };
    row.pnl += x.pnl;
    row.count += 1;
    if (x.pnl > 0) row.wins += 1;
    bySetup.set(key, row);
  }

  return [...bySetup.entries()]
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 3)
    .map(([name, stats]) => {
      const expectancy = stats.pnl / stats.count;
      return {
        label: stats.pnl >= 0 ? "Positive setup evidence" : "Negative setup evidence",
        value: name,
        detail: `${stats.count} trades · ${expectancy >= 0 ? "+" : ""}${expectancy.toFixed(2)} average P&L · ${pct((stats.wins / stats.count) * 100)} wins`,
        tone: expectancy > 0 ? "positive" : expectancy < 0 ? "caution" : "neutral",
        sampleSize: stats.count,
        strength: evidenceStrength(stats.count),
      };
    });
}

export function buildIntelligence(input: { trades: Trade[]; checkins: DailyCheckin[]; journals: JournalEntry[] }): IntelligenceResult {
  const now = new Date();
  const recentCutoff = new Date(now);
  recentCutoff.setDate(recentCutoff.getDate() - 7);
  const prevCutoff = new Date(now);
  prevCutoff.setDate(prevCutoff.getDate() - 14);
  const closed = input.trades
    .map((trade) => ({ trade, pnl: pnlOfTrade(trade) }))
    .filter((x): x is { trade: Trade; pnl: number } => x.pnl != null && x.trade.status === "closed");
  const recent = closed.filter(({ trade }) => new Date(trade.exitAt ?? trade.entryAt) >= recentCutoff);
  const previous = closed.filter(({ trade }) => {
    const date = new Date(trade.exitAt ?? trade.entryAt);
    return date >= prevCutoff && date < recentCutoff;
  });
  const recentPnl = recent.reduce((sum, x) => sum + x.pnl, 0);
  const previousPnl = previous.reduce((sum, x) => sum + x.pnl, 0);
  const wins = recent.filter((x) => x.pnl > 0).length;
  const winRate = recent.length ? (wins / recent.length) * 100 : null;
  const latestCheckin = [...input.checkins].sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  const readiness = readinessFromCheckin(latestCheckin);

  const checkinsByDate = new Map(input.checkins.map((checkin) => [checkin.date, checkin]));
  const stateRows = closed.flatMap(({ trade, pnl }) => {
    const key = localDateKey(trade.entryAt);
    const checkin = key ? checkinsByDate.get(key) : undefined;
    return checkin ? [{ checkin, pnl }] : [];
  });

  const correlations: IntelligenceCorrelation[] = [];
  const pushCorrelation = (value: IntelligenceCorrelation | null) => {
    if (value && value.strength !== "insufficient") correlations.push(value);
  };

  pushCorrelation(splitMetricEvidence("Sleep × performance", "Sleep hours", stateRows.flatMap(({ checkin, pnl }) => {
    const metric = checkin.sleepHours == null ? null : Number(checkin.sleepHours);
    return metric != null && Number.isFinite(metric) ? [{ metric, pnl }] : [];
  })));
  pushCorrelation(splitMetricEvidence("Energy × performance", "Energy", stateRows.flatMap(({ checkin, pnl }) => checkin.energy == null ? [] : [{ metric: checkin.energy, pnl }])));
  pushCorrelation(splitMetricEvidence("Focus × performance", "Focus", stateRows.flatMap(({ checkin, pnl }) => checkin.focus == null ? [] : [{ metric: checkin.focus, pnl }])));

  const ratingRows = closed.flatMap(({ trade, pnl }) => trade.rating == null ? [] : [{ metric: trade.rating, pnl }]);
  pushCorrelation(splitMetricEvidence("Trade rating × outcome", "Trade rating", ratingRows));

  const weekday = new Map<number, { pnl: number; count: number }>();
  for (const { trade, pnl } of closed) {
    const day = new Date(trade.entryAt).getDay();
    const row = weekday.get(day) ?? { pnl: 0, count: 0 };
    row.pnl += pnl;
    row.count += 1;
    weekday.set(day, row);
  }
  const bestWeekday = [...weekday.entries()].filter(([, v]) => v.count >= 3).sort((a, b) => b[1].pnl - a[1].pnl)[0];
  if (bestWeekday) {
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const avg = bestWeekday[1].pnl / bestWeekday[1].count;
    correlations.push({
      label: "Day-of-week pattern",
      headline: `${names[bestWeekday[0]]} is the strongest documented trading day`,
      detail: `${bestWeekday[1].count} trades on ${names[bestWeekday[0]]} averaged ${avg >= 0 ? "+" : ""}${avg.toFixed(2)} P&L.`,
      higher: names[bestWeekday[0]],
      lower: "Other weekdays",
      sampleSize: bestWeekday[1].count,
      tone: avg >= 0 ? "positive" : "caution",
      strength: evidenceStrength(bestWeekday[1].count),
    });
  }

  const lowReadinessDates = new Set(input.checkins.filter((c) => {
    const score = readinessFromCheckin(c).score;
    return score != null && score < 50;
  }).map((c) => c.date));
  const lowReadinessTrades = closed.filter(({ trade }) => {
    const key = localDateKey(trade.entryAt);
    return key ? lowReadinessDates.has(key) : false;
  });
  const lowReadinessLossRate = lowReadinessTrades.length
    ? (lowReadinessTrades.filter((x) => x.pnl <= 0).length / lowReadinessTrades.length) * 100
    : null;

  const rulesTrades = closed.filter(({ trade }) => trade.rulesFollowed != null);
  const ruleBreaks = rulesTrades.filter(({ trade }) => trade.rulesFollowed === false);
  const followedRules = rulesTrades.filter(({ trade }) => trade.rulesFollowed === true);
  const ruleBreakLossRate = ruleBreaks.length ? (ruleBreaks.filter((x) => x.pnl <= 0).length / ruleBreaks.length) * 100 : null;
  const normalRuleLossRate = followedRules.length ? (followedRules.filter((x) => x.pnl <= 0).length / followedRules.length) * 100 : null;

  const observations: IntelligenceEvidence[] = [{
    label: "Weekly tape",
    value: `${recent.length} closed trades`,
    detail: `${recentPnl >= 0 ? "+" : ""}${recentPnl.toFixed(2)} P&L over the last 7 days`,
    tone: recentPnl >= 0 ? "positive" : "caution",
    sampleSize: recent.length,
    strength: evidenceStrength(recent.length),
  }];
  const edge: IntelligenceEvidence[] = [];
  const risks: IntelligenceEvidence[] = [];

  if (readiness.score != null) observations.push({
    label: "Today's state",
    value: `${readiness.score}/100`,
    detail: `${readiness.label}${readiness.mood ? ` · ${readiness.mood}` : ""}`,
    tone: readiness.score >= 60 ? "positive" : "caution",
  });
  if (recent.length >= 3 && previous.length >= 3) observations.push({
    label: "Week over week",
    value: `${recentPnl - previousPnl >= 0 ? "+" : ""}${(recentPnl - previousPnl).toFixed(2)}`,
    detail: "Difference versus the previous 7-day window",
    sampleSize: recent.length + previous.length,
    strength: evidenceStrength(recent.length + previous.length),
  });

  edge.push(...setupEvidence(closed).filter((item) => item.tone === "positive"));
  const avgRecent = average(recent.map((x) => x.pnl));
  if (avgRecent != null) edge.push({
    label: "Recent expectancy",
    value: `${avgRecent >= 0 ? "+" : ""}${avgRecent.toFixed(2)}`,
    detail: "Average realized P&L across closed trades in the last 7 days",
    tone: avgRecent > 0 ? "positive" : "caution",
    sampleSize: recent.length,
    strength: evidenceStrength(recent.length),
  });

  if (lowReadinessTrades.length >= 3 && lowReadinessLossRate != null) risks.push({
    label: "Low-readiness pattern",
    value: `${pct(lowReadinessLossRate)} loss rate`,
    detail: `${lowReadinessTrades.length} trades entered on low-readiness days. Treat as a review signal, not a prediction.`,
    tone: lowReadinessLossRate >= 60 ? "caution" : "neutral",
    sampleSize: lowReadinessTrades.length,
    strength: evidenceStrength(lowReadinessTrades.length),
  });
  if (ruleBreaks.length >= 2 && ruleBreakLossRate != null) {
    const detail = normalRuleLossRate == null
      ? `${ruleBreaks.length} rule-break trades logged`
      : `${pct(ruleBreakLossRate)} loss rate vs ${pct(normalRuleLossRate)} when rules were followed`;
    risks.push({
      label: "Rule adherence",
      value: `${ruleBreaks.length} breaks`,
      detail,
      tone: ruleBreakLossRate > (normalRuleLossRate ?? 50) ? "caution" : "neutral",
      sampleSize: ruleBreaks.length,
      strength: evidenceStrength(ruleBreaks.length),
    });
  }
  if (recent.length && recent.every((x) => x.pnl < 0)) risks.push({
    label: "Current streak",
    value: `${recent.length} losses`,
    detail: "Protect the process: review sizing, readiness and rule adherence before adding complexity.",
    tone: "caution",
    sampleSize: recent.length,
    strength: evidenceStrength(recent.length),
  });

  correlations.sort((a, b) => b.sampleSize - a.sampleSize);

  const nextActions: string[] = [];
  if (readiness.score != null && readiness.score < 60) nextActions.push("Run the Today check-in before opening a new position.");
  if (ruleBreaks.length >= 2) nextActions.push("Review the last rule-break trades and write one concrete prevention rule.");
  if (correlations[0] && correlations[0].tone === "caution") nextActions.push(`Review whether the ${correlations[0].label.toLowerCase()} pattern justifies a process change before changing your strategy.`);
  if (!nextActions.length) nextActions.push("Keep logging pre-trade plans, state and post-trade reviews; Quill gets sharper as the evidence grows.");

  const confidence: IntelligenceResult["confidence"] = closed.length >= 30 && input.checkins.length >= 14
    ? "strong"
    : closed.length >= 10 && input.checkins.length >= 5
      ? "building"
      : "early";

  return {
    generatedAt: now.toISOString(),
    confidence,
    sampleSize: { trades: closed.length, checkins: input.checkins.length, journals: input.journals.length },
    readiness,
    weekly: {
      pnl: recentPnl,
      trades: recent.length,
      winRate,
      previousPnl,
      deltaPnl: recent.length && previous.length ? recentPnl - previousPnl : null,
      journalEntries: input.journals.filter((j) => new Date(j.createdAt) >= recentCutoff).length,
    },
    observations,
    edge,
    risks,
    correlations: correlations.slice(0, 6),
    nextActions,
  };
}
