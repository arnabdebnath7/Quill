"use client";

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function QuillIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
      className="relative mx-auto flex h-[200px] w-[260px] items-center justify-center text-brand sm:h-[220px] sm:w-[300px]"
    >
      {/* Hand-drawn journal + quill illustration */}
      <svg viewBox="0 0 260 200" width="100%" height="100%" className="overflow-visible">
        {/* Subtle paper texture background */}
        <ellipse cx="130" cy="185" rx="90" ry="10" fill="currentColor" opacity="0.06" />
        
        {/* Journal base */}
        <motion.g
          initial={{ rotate: -2 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
        >
          <path
            d="M 50 70 Q 50 50 70 50 L 190 50 Q 210 50 210 70 L 210 150 Q 210 170 190 170 L 70 170 Q 50 170 50 150 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 50 70 Q 50 50 70 50 L 80 50 Q 60 50 60 70 L 60 150 Q 60 170 80 170 L 70 170 Q 50 170 50 150 Z"
            fill="var(--paper-2)"
            stroke="currentColor"
            strokeWidth="2"
          />
          {/* Pages lines */}
          <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }}>
            <line x1="75" y1="75" x2="185" y2="75" stroke="currentColor" strokeWidth="1.2" opacity="0.25" strokeLinecap="round" />
            <line x1="75" y1="90" x2="185" y2="90" stroke="currentColor" strokeWidth="1.2" opacity="0.2" strokeLinecap="round" />
            <line x1="75" y1="105" x2="160" y2="105" stroke="currentColor" strokeWidth="1.2" opacity="0.18" strokeLinecap="round" />
            <line x1="75" y1="120" x2="175" y2="120" stroke="currentColor" strokeWidth="1.2" opacity="0.15" strokeLinecap="round" />
          </motion.g>
        </motion.g>

        {/* Feather quill - floating above journal */}
        <motion.g
          initial={{ y: -10, rotate: 12, opacity: 0 }}
          animate={{ y: 0, rotate: 8, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35, type: "spring", bounce: 0.3 }}
        >
          {/* Feather shadow */}
          <ellipse cx="145" cy="48" rx="18" ry="4" fill="currentColor" opacity="0.08" />
          {/* Feather */}
          <g transform="translate(110, 15) rotate(22)">
            <path
              d="M 20 55 C 16 48 12 38 12 28 C 12 18 16 10 22 4 C 28 -2 36 -6 48 -8 C 50 -4 50 0 48 5 C 46 9 42 13 38 16 C 38 16 42 14 46 10 C 46 10 44 14 40 16 C 36 18 32 18 30 20 C 30 20 34 19 38 16 C 38 16 36 20 32 22 C 28 24 24 24 22 26 C 20 28 20 32 20 36 C 20 42 20 50 20 55 Z"
              fill="var(--card)"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M 20 55 C 21 46 23 38 26 32 C 29 26 32 20 38 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </motion.g>

        {/* Accent dot */}
        <motion.circle
          cx="195"
          cy="35"
          r="14"
          fill="currentColor"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4, type: "spring", bounce: 0.5 }}
        />
      </svg>
    </motion.div>
  );
}
