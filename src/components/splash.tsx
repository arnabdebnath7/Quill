"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function Splash() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"circle" | "feather" | "text" | "final">("circle");

  useEffect(() => {
    if (sessionStorage.getItem("quill-splash")) return;
    sessionStorage.setItem("quill-splash", "1");
    setShow(true);
    
    // Sequence: circle -> feather -> text -> final
    const t1 = setTimeout(() => setPhase("feather"), 300);
    const t2 = setTimeout(() => setPhase("text"), 1100);
    const t3 = setTimeout(() => setPhase("final"), 1900);
    const t4 = setTimeout(() => setShow(false), 2800);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: "#FAF6EB" }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative flex flex-col items-center">
            {/* Logo container - 280px wide to match reference proportions */}
            <div className="relative" style={{ width: 280, height: 380 }}>
              {/* Circle background */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 200,
                  height: 200,
                  background: "#1A3B32",
                }}
              />

              {/* Feather - reveal/draw animation */}
              <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2" style={{ width: 200, height: 200 }}>
                <svg viewBox="0 0 200 200" width="200" height="200" className="overflow-visible">
                  {/* Feather clip reveal from bottom to top */}
                  <motion.g
                    initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
                    animate={
                      phase === "circle"
                        ? { clipPath: "inset(100% 0% 0% 0%)" }
                        : { clipPath: "inset(0% 0% 0% 0%)" }
                    }
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  >
                    {/* Feather white shape - exact from reference */}
                    <path
                      d="
                        M 92 172
                        C 84 158 68 138 65 110
                        C 62 88 70 70 82 56
                        C 94 42 116 28 148 18
                        C 151 28 152 40 147 52
                        C 142 62 134 70 126 76
                        C 126 76 136 73 144 66
                        C 144 66 140 76 132 82
                        C 124 88 114 90 108 96
                        C 108 96 118 94 126 88
                        C 126 88 120 98 110 102
                        C 100 106 92 108 88 114
                        C 84 120 84 130 86 138
                        C 88 148 90 162 92 172
                        Z
                      "
                      fill="white"
                    />
                    {/* Rachis */}
                    <path
                      d="
                        M 92 172
                        C 94 150 100 130 108 114
                        C 116 98 126 84 142 68
                        C 130 80 120 92 112 106
                        C 104 120 96 138 92 172
                        Z
                      "
                      fill="#1A3B32"
                    />
                  </motion.g>

                  {/* Feather stroke draw effect overlay */}
                  <motion.path
                    d="
                      M 92 172
                      C 84 158 68 138 65 110
                      C 62 88 70 70 82 56
                      C 94 42 116 28 148 18
                    "
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={
                      phase === "circle"
                        ? { pathLength: 0, opacity: 0 }
                        : { pathLength: 1, opacity: 1 }
                    }
                    transition={{ duration: 0.8, ease: "easeInOut", delay: 0.3 }}
                  />
                </svg>
              </div>

              {/* Text quill - reveal left to right */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <motion.div
                  initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
                  animate={
                    phase === "text" || phase === "final"
                      ? { clipPath: "inset(0% 0% 0% 0%)" }
                      : { clipPath: "inset(0% 100% 0% 0%)" }
                  }
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className="font-bold tracking-[-0.02em] leading-none select-none"
                    style={{
                      fontFamily: "var(--font-jakarta), Inter, sans-serif",
                      fontSize: 64,
                      color: "#1A3B32",
                      letterSpacing: "-0.02em",
                      fontWeight: 700,
                    }}
                  >
                    quill
                  </div>
                </motion.div>
              </div>

              {/* Final exact logo image - pixel perfect match to reference */}
              <motion.img
                src="/quill-logo.png"
                alt="Quill"
                className="absolute inset-0 h-full w-full object-contain"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "final" ? 1 : 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                style={{ background: "#FAF6EB" }}
              />
            </div>

            {/* Subtle progress indicator */}
            <motion.div
              className="mt-12 h-[2px] w-24 overflow-hidden rounded-full"
              style={{ background: "rgba(26,59,50,0.12)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase !== "final" ? 1 : 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "#1A3B32" }}
                initial={{ x: "-100%" }}
                animate={{ x: phase === "text" || phase === "final" ? "0%" : "-40%" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
