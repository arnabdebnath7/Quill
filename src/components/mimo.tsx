"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export type MimoState = "idle" | "thinking" | "celebrate";

type MimoProps = {
  size?: number;
  compact?: boolean;
  state?: MimoState;
  className?: string;
};

type Gaze = { x: number; y: number };

/**
 * Mimo — Quill's little companion. Its eyes follow the pointer.
 * Pointer tracking is shared by every instance (one window listener) so a page
 * with a dozen Mimos does not register a dozen `pointermove` handlers.
 */
const gazeListeners = new Set<(gaze: Gaze, travelled: number) => void>();
let gazeFrame: number | null = null;
let latestGaze: Gaze = { x: 0, y: 0 };
let lastPointer: { x: number; y: number } | null = null;
let pendingTravel = 0;

function onPointerMove(event: PointerEvent) {
  const nx = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
  const ny = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
  latestGaze = { x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) };
  if (lastPointer) pendingTravel += Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
  lastPointer = { x: event.clientX, y: event.clientY };
  if (gazeFrame == null) {
    gazeFrame = window.requestAnimationFrame(() => {
      gazeFrame = null;
      const travelled = pendingTravel;
      pendingTravel = 0;
      gazeListeners.forEach((listener) => listener(latestGaze, travelled));
    });
  }
}

function subscribeGaze(listener: (gaze: Gaze, travelled: number) => void) {
  if (gazeListeners.size === 0) window.addEventListener("pointermove", onPointerMove, { passive: true });
  gazeListeners.add(listener);
  return () => {
    gazeListeners.delete(listener);
    if (gazeListeners.size === 0) {
      window.removeEventListener("pointermove", onPointerMove);
      if (gazeFrame != null) {
        window.cancelAnimationFrame(gazeFrame);
        gazeFrame = null;
      }
    }
  };
}

export function Mimo({ size = 42, compact = false, state = "idle", className }: MimoProps) {
  const reduceMotion = useReducedMotion();
  const [gaze, setGaze] = useState<Gaze>({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [playful, setPlayful] = useState(false);
  const travelledRef = useRef(0);
  const playfulRef = useRef(false);

  useEffect(() => {
    if (reduceMotion) return;
    let playfulTimer: number | undefined;
    const unsubscribe = subscribeGaze((next, travelled) => {
      setGaze(next);
      travelledRef.current += travelled;
      if (travelledRef.current > 1800 && !playfulRef.current) {
        travelledRef.current = 0;
        playfulRef.current = true;
        setPlayful(true);
        playfulTimer = window.setTimeout(() => {
          playfulRef.current = false;
          setPlayful(false);
        }, 1450);
      }
    });
    return () => {
      unsubscribe();
      window.clearTimeout(playfulTimer);
    };
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    let openTimer: number | undefined;
    let closeTimer: number | undefined;
    const schedule = () => {
      openTimer = window.setTimeout(() => {
        setBlink(true);
        closeTimer = window.setTimeout(() => setBlink(false), 155);
        schedule();
      }, 2800 + Math.random() * 3400);
    };
    schedule();
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [reduceMotion]);

  const eyeX = gaze.x * (compact ? 2.6 : 5);
  const eyeY = gaze.y * (compact ? 2.1 : 3.4);
  const eyeScaleY = blink ? 0.08 : playful ? 0.82 : 1;
  const face = compact ? Math.min(size, 42) : size;
  const pupil = Math.max(6, face * 0.22);
  const eye = Math.max(10, face * 0.27);

  return (
    <motion.div
      className={`relative inline-flex shrink-0 select-none items-center justify-center ${className ?? ""}`}
      style={{ width: face, height: face }}
      animate={reduceMotion ? undefined : playful ? { rotate: [0, -3, 3, -2, 0], y: [0, -1, 1, -2, 0] } : { y: [0, -1.5, 0] }}
      transition={playful ? { duration: 1.2, ease: "easeInOut" } : { duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      title="Mimo"
      aria-label="Mimo, Quill's interactive AI companion"
    >
      <div className="absolute inset-[5%] rounded-[30%] border border-brand/25 bg-[radial-gradient(circle_at_35%_25%,color-mix(in_srgb,var(--brand)_20%,transparent),transparent_45%),var(--card)] shadow-[0_10px_30px_-18px_var(--brand)]" />
      <motion.div
        className="absolute inset-[13%] rounded-[27%] border border-line/80 bg-paper/85"
        animate={reduceMotion ? undefined : { rotate: [0, 1, 0, -1, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 flex items-center gap-[14%]">
        {[0, 1].map((index) => (
          <motion.div
            key={index}
            className="relative overflow-hidden rounded-full border border-ink/12 bg-white"
            style={{ width: eye, height: eye }}
            animate={{ scaleY: eyeScaleY }}
            transition={{ duration: 0.12 }}
          >
            <motion.div
              className="absolute rounded-full bg-ink"
              style={{ width: pupil, height: pupil, left: `calc(50% - ${pupil / 2}px)`, top: `calc(50% - ${pupil / 2}px)` }}
              animate={{ x: eyeX, y: eyeY }}
              transition={{ type: "spring", stiffness: 250, damping: 22, mass: 0.35 }}
            />
            <span className="absolute left-[28%] top-[24%] h-[18%] w-[18%] rounded-full bg-white/90" />
          </motion.div>
        ))}
      </div>
      <motion.div
        className="absolute bottom-[17%] left-1/2 h-[9%] w-[25%] -translate-x-1/2 rounded-b-full border-b-2 border-ink/55"
        animate={playful ? { rotate: -7, scaleX: 1.2 } : state === "thinking" ? { scaleX: 0.72 } : { scaleX: 1 }}
        transition={{ duration: 0.2 }}
      />
      {(playful || state === "celebrate") && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.7 }}
          animate={{ opacity: 1, y: -face * 0.55, scale: 1 }}
          transition={{ type: "spring", stiffness: 340, damping: 18 }}
          className="absolute -right-[15%] -top-[14%] flex h-6 w-6 items-center justify-center rounded-lg border border-brand/20 bg-card text-brand shadow-sm"
        >
          <Gift className="h-3.5 w-3.5" />
        </motion.div>
      )}
      {!compact && state === "thinking" && (
        <motion.div
          className="absolute -right-3 -top-3 rounded-full border border-line bg-card/90 px-1.5 py-1 text-brand shadow-sm"
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          <Sparkles className="h-3 w-3" />
        </motion.div>
      )}
    </motion.div>
  );
}
