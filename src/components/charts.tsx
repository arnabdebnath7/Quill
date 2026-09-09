"use client";

import { useEffect, useId, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";

/* Animated number that tweens between values */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return () => controls.stop();
  }, [value]);
  return <span className={className}>{format ? format(display) : display.toFixed(0)}</span>;
}

function nicePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

/* ---------------- Equity / line + area chart ---------------- */
export function AreaChart({
  data,
  height = 220,
  positive,
  formatY,
  formatX,
}: {
  data: { label: string; value: number }[];
  height?: number;
  positive?: boolean;
  formatY?: (v: number) => string;
  formatX?: (i: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  const W = 720;
  const H = height;
  const PAD_X = 8;
  const PAD_TOP = 16;
  const PAD_BOTTOM = 26;

  const values = data.map((d) => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const x = (i: number) => PAD_X + (i / Math.max(data.length - 1, 1)) * (W - PAD_X * 2);
  const y = (v: number) => PAD_TOP + (1 - (v - min) / span) * (H - PAD_TOP - PAD_BOTTOM);

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }));
  const line = nicePath(pts);
  const area = line ? `${line} L ${x(data.length - 1)} ${H - PAD_BOTTOM} L ${x(0)} ${H - PAD_BOTTOM} Z` : "";
  const zeroY = y(0);
  const good = positive ?? (values[values.length - 1] ?? 0) >= (values[0] ?? 0);
  const color = good ? "var(--up)" : "var(--down)";

  return (
    <div
      ref={ref}
      className="relative w-full"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const box = ref.current?.getBoundingClientRect();
        if (!box || data.length === 0) return;
        const rx = ((e.clientX - box.left) / box.width) * W;
        let best = 0;
        let bd = Infinity;
        pts.forEach((p, i) => {
          const d = Math.abs(p.x - rx);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        setHover(best);
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" style={{ height }}>
        <defs>
          <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* zero line */}
        <line x1={PAD_X} x2={W - PAD_X} y1={zeroY} y2={zeroY} stroke="var(--line-strong)" strokeDasharray="3 5" strokeWidth="1" />
        {area && (
          <motion.path
            d={area}
            fill={`url(#g${uid})`}
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 1, delay: 0.3 }}
          />
        )}
        {line && (
          <motion.path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : {}}
            transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
          />
        )}
        {hover != null && pts[hover] && (
          <g>
            <line x1={pts[hover].x} x2={pts[hover].x} y1={PAD_TOP} y2={H - PAD_BOTTOM} stroke="var(--line-strong)" strokeWidth="1" />
            <circle cx={pts[hover].x} cy={pts[hover].y} r="4.5" fill="var(--card)" stroke={color} strokeWidth="2.4" />
          </g>
        )}
      </svg>
      {hover != null && data[hover] && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] shadow-md"
          style={{
            left: `${(pts[hover].x / W) * 100}%`,
            top: (pts[hover].y / H) * height - 10,
          }}
        >
          <div className="font-medium tabular" style={{ color }}>
            {formatY ? formatY(data[hover].value) : data[hover].value.toFixed(2)}
          </div>
          <div className="text-faint">{formatX ? formatX(hover) : data[hover].label}</div>
        </div>
      )}
      <div className="mt-1 flex justify-between px-1 text-[10px] text-faint">
        <span>{formatX ? formatX(0) : data[0]?.label}</span>
        <span>{formatX ? formatX(data.length - 1) : data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ---------------- Donut ---------------- */
export function Donut({
  parts,
  size = 150,
  thickness = 16,
}: {
  parts: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const R = (size - thickness) / 2;
  const C = 2 * Math.PI * R;
  let acc = 0;

  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {parts.map((p) => {
          const frac = p.value / total;
          const dash = frac * C;
          const offset = -acc * C;
          acc += frac;
          return (
            <motion.circle
              key={p.label}
              cx={size / 2}
              cy={size / 2}
              r={R}
              fill="none"
              stroke={p.color}
              strokeWidth={thickness}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${C - dash}`}
              initial={{ strokeDashoffset: offset, opacity: 0 }}
              animate={inView ? { strokeDashoffset: offset, opacity: 1 } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold tabular">{parts.length}</span>
        <span className="text-[10px] uppercase tracking-widest text-faint">markets</span>
      </div>
    </div>
  );
}

/* ---------------- Horizontal bars ---------------- */
export function HBars({
  data,
  format,
}: {
  data: { label: string; value: number }[];
  format?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);

  return (
    <div ref={ref} className="grid gap-3.5">
      {data.map((d, i) => {
        const pos = d.value >= 0;
        const w = (Math.abs(d.value) / maxAbs) * 100;
        return (
          <div key={d.label} className="grid gap-1">
            <div className="flex items-baseline justify-between text-[12.5px]">
              <span className="text-sub">{d.label}</span>
              <span className={cnNum(pos)}>{format ? format(d.value) : d.value.toFixed(0)}</span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-line/50">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: pos ? "var(--up)" : "var(--down)", width: `${w}%` }}
                initial={{ x: "-101%" }}
                animate={inView ? { x: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function cnNum(pos: boolean) {
  return `font-medium tabular ${pos ? "text-up" : "text-down"}`;
}

/* ---------------- Sparkline ---------------- */
export function Sparkline({ points, width = 96, height = 28, up }: { points: number[]; width?: number; height?: number; up?: boolean }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pts = points.map((v, i) => ({
    x: (i / Math.max(points.length - 1, 1)) * width,
    y: 2 + (1 - (v - min) / span) * (height - 4),
  }));
  const isUp = up ?? (points[points.length - 1] ?? 0) >= (points[0] ?? 0);
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={nicePath(pts)}
        fill="none"
        stroke={isUp ? "var(--up)" : "var(--down)"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------- Win-rate ring ---------------- */
export function WinRing({ rate, size = 120 }: { rate: number; size?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const R = (size - 12) / 2;
  const C = 2 * Math.PI * R;
  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line)" strokeWidth="9" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke="var(--up)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={inView ? { strokeDashoffset: C * (1 - rate / 100) } : {}}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber value={rate} format={(n) => `${n.toFixed(0)}%`} className="font-display text-2xl font-semibold tabular" />
        <span className="text-[9.5px] uppercase tracking-widest text-faint">win rate</span>
      </div>
    </div>
  );
}
