"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, type Transition } from "framer-motion";
import { Sparkles, PartyPopper } from "lucide-react";
import { EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MimoState = "idle" | "thinking" | "celebrate" | "hallucinating";

type MimoProps = {
  size?: number;
  compact?: boolean;
  state?: MimoState;
  className?: string;
};

const FACE_SRC = "/mimo/face.png";

/**
 * Mimo — Quill's companion.
 *
 * Renders the user's face image (public/mimo/face.png) as the companion's
 * face. If the image is missing it falls back to a minimal CSS face so the
 * app never shows a broken avatar.
 */
export function Mimo({ size = 42, compact = false, state = "idle", className }: MimoProps) {
  const reduceMotion = useReducedMotion();
  const [faceBroken, setFaceBroken] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [playful, setPlayful] = useState(false);

  // CSS-face extras (gaze + blink) only matter for the fallback.
  useEffect(() => {
    if (reduceMotion || !faceBroken) return;
    let raf: number | null = null;
    let last: { x: number; y: number } | null = null;
    let distance = 0;
    let next = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      next = {
        x: Math.max(-1, Math.min(1, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2)),
        y: Math.max(-1, Math.min(1, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2)),
      };
      if (last) {
        distance += Math.hypot(event.clientX - last.x, event.clientY - last.y);
        if (distance > 1800 && !playful) {
          distance = 0;
          setPlayful(true);
          window.setTimeout(() => setPlayful(false), 1450);
        }
      }
      last = { x: event.clientX, y: event.clientY };
      if (raf == null) {
        raf = window.requestAnimationFrame(() => {
          raf = null;
          setGaze(next);
        });
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (raf != null) window.cancelAnimationFrame(raf);
    };
  }, [playful, reduceMotion, faceBroken]);

  useEffect(() => {
    if (reduceMotion || !faceBroken) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 150);
        schedule();
      }, 2800 + Math.random() * 3400);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [reduceMotion, faceBroken]);

  const activePlayful = playful || state === "hallucinating";
  const faceStyle = !faceBroken ? (compact ? { rotate: [0, -2, 2, -1.5, 0] } : { y: [0, -2, 0] }) : { y: [0, -1.5, 0] };
  const faceTransition: Transition = activePlayful
    ? { duration: 1.1, ease: "easeInOut" }
    : { duration: compact ? 3.2 : 4.4, repeat: Infinity, ease: "easeInOut" };

  const ringClass =
    state === "thinking"
      ? "border-primary/60 shadow-[0_0_0_3px_var(--primary-soft)]"
      : state === "celebrate"
        ? "border-up/50 shadow-[0_0_0_3px_var(--up-soft)]"
        : activePlayful
          ? "border-primary/40"
          : "border-border";

  return (
    <motion.div
      className={cn("relative inline-flex shrink-0 select-none items-center justify-center", className)}
      style={{ width: size, height: size }}
      animate={reduceMotion ? undefined : faceStyle}
      transition={reduceMotion ? undefined : faceTransition}
      title="Mimo"
      aria-label="Mimo, Quill's interactive companion"
    >
      {/* face */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-full border-2 bg-muted transition-all duration-300",
          ringClass,
          state === "thinking" && "animate-[pulse-dot_1.6s_ease-in-out_infinite]",
        )}
        style={size < 30 ? { borderWidth: 1.5 } : undefined}
      >
        {!faceBroken ? (
          <Image
            src={FACE_SRC}
            alt="Mimo"
            fill
            sizes={`${size}px`}
            className="object-cover"
            onError={() => setFaceBroken(true)}
            unoptimized
          />
        ) : (
          <CssFace size={size} gaze={gaze} blink={blink} playful={activePlayful} thinking={state === "thinking"} />
        )}
      </div>

      {/* status badge */}
      {!compact && (
        <span className="absolute -bottom-0.5 -right-0.5 z-10 flex h-[30%] min-h-[14px] w-[30%] min-w-[14px] items-center justify-center rounded-full border border-background bg-card">
          {state === "thinking" ? (
            <motion.span
              className="text-primary"
              animate={reduceMotion ? undefined : { opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            >
              <Sparkles className="h-[55%] w-[55%]" />
            </motion.span>
          ) : state === "celebrate" ? (
            <span className="text-up">
              <PartyPopper className="h-[55%] w-[55%]" />
            </span>
          ) : (
            <span className={cn("h-[38%] w-[38%] rounded-full", activePlayful ? "bg-primary" : "bg-up")} />
          )}
        </span>
      )}
    </motion.div>
  );
}

/* --------------------------- CSS fallback face --------------------------- */
function CssFace({ size, gaze, blink, playful, thinking }: { size: number; gaze: { x: number; y: number }; blink: boolean; playful: boolean; thinking: boolean }) {
  const eye = Math.max(7, size * 0.2);
  const pupil = Math.max(4, size * 0.13);
  const eyeX = gaze.x * (size * 0.07);
  const eyeY = gaze.y * (size * 0.06);
  const eyeScaleY = blink ? 0.12 : playful ? 0.75 : 1;

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[16%]">
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="relative flex items-center justify-center overflow-hidden rounded-full bg-foreground/15"
          style={{ width: eye, height: eye }}
          animate={{ scaleY: eyeScaleY }}
          transition={{ duration: 0.12 }}
        >
          <motion.span
            className="rounded-full bg-foreground/80"
            style={{ width: pupil, height: pupil }}
            animate={{ x: eyeX, y: eyeY }}
            transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.35 }}
          />
        </motion.span>
      ))}
      <span
        className="pointer-events-none absolute bottom-[24%] left-1/2 h-[8%] w-[22%] -translate-x-1/2 rounded-b-full border-b-2 border-foreground/40 transition-transform duration-200"
        style={{ transform: `translateX(-50%) scaleX(${thinking ? 0.7 : playful ? 1.25 : 1}) ${playful ? "rotate(-6deg)" : ""}` }}
      />
    </div>
  );
}
