"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, DatabaseZap, Fingerprint } from "lucide-react";
import type { IntelligenceCorrelation } from "@/lib/intelligence";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  correlations: IntelligenceCorrelation[];
};

function toneClass(tone: IntelligenceCorrelation["tone"]) {
  if (tone === "positive") return "text-up";
  if (tone === "caution") return "text-down";
  return "text-muted-foreground";
}

function strengthCopy(strength: IntelligenceCorrelation["strength"]) {
  if (strength === "useful") return "Useful sample";
  if (strength === "emerging") return "Emerging signal";
  return "Insufficient sample";
}

function moneyFromDetail(detail: string) {
  const match = detail.match(/P&L\s+([+-]?\d+(?:\.\d+)?)/i);
  return match?.[1] ?? null;
}

export default function EvidenceLab({ correlations }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (!correlations.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="font-display text-[17px] font-semibold">Not enough paired evidence yet.</div>
          <p className="mt-2 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
            Quill only publishes a relationship when enough trades can be paired with a recorded state. Keep completing Today check-ins and closing trades with consistent reviews.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {correlations.map((item, index) => {
        const open = openId === item.id;
        return (
          <motion.div
            key={`${item.id}-${item.headline}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Card className="h-full overflow-hidden">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
                className="block w-full text-left p-5 sm:p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Fingerprint className={cn("h-4 w-4", toneClass(item.tone))} />
                    <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">{item.label}</div>
                  </div>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    n={item.sampleSize}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-[17px] font-semibold leading-snug tracking-[-0.02em]">{item.headline}</h3>
                <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">{item.detail}</p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Higher</div>
                    <div className="mt-1 text-[11px] font-medium">{item.higher}</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Lower</div>
                    <div className="mt-1 text-[11px] font-medium">{item.lower}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  <span>{strengthCopy(item.strength)}</span>
                  <span className={toneClass(item.tone)}>{item.tone === "positive" ? "supports review" : item.tone === "caution" ? "watch closely" : "neutral"}</span>
                </div>

                <div className="mt-4 flex items-center justify-center gap-1 text-[10px] font-semibold text-primary">
                  {open ? "Hide evidence" : "Inspect evidence"}
                  {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </div>
              </button>

              {open && (
                <div className="border-t border-border bg-muted/25 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  <div className="flex items-center gap-2">
                    <DatabaseZap className="h-3.5 w-3.5 text-primary" />
                    <div className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Observed sample</div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {item.evidence.map((point) => {
                      const pnl = moneyFromDetail(point.detail);
                      return (
                        <div key={point.id} className="rounded-xl border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[11px] font-semibold">{point.label}</div>
                              <div className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{point.date}</div>
                            </div>
                            {pnl && (
                              <div className={cn("text-[11px] font-semibold", Number(pnl) >= 0 ? "text-up" : "text-down")}>
                                {Number(pnl) >= 0 ? "+" : ""}{pnl}
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">{point.detail}</p>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-[9.5px] leading-relaxed text-muted-foreground">
                    Observed evidence, not a forecast. These rows explain the sample behind this signal; they do not predict future outcomes.
                  </p>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
