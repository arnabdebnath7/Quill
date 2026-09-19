"use client";
import { motion } from "framer-motion";

export function QuillLogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      aria-label="Quill logo"
    >
      <svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="96" fill="#1A3B32" />
        {/* Feather */}
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
      </svg>
    </div>
  );
}

export function QuillLogoFull({ width = 300, className }: { width?: number; className?: string }) {
  return (
    <div className={className} style={{ width }}>
      <svg viewBox="0 0 400 520" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="520" rx="88" fill="#FAF6EB" />
        <circle cx="200" cy="210" r="138" fill="#1A3B32" />
        <path
          d="
            M 192 350
            C 180 328 150 300 144 250
            C 140 220 150 190 168 168
            C 186 146 212 124 268 102
            C 274 118 276 136 268 156
            C 260 172 248 186 236 196
            C 236 196 250 190 262 178
            C 262 178 256 194 244 202
            C 232 210 218 212 210 222
            C 210 222 224 220 236 210
            C 236 210 228 228 214 236
            C 200 244 186 246 178 256
            C 170 266 168 278 170 288
            C 172 300 178 318 192 350
            Z
          "
          fill="white"
        />
        <path
          d="
            M 192 350
            C 196 314 208 282 224 256
            C 240 230 260 208 286 184
            C 266 202 248 220 234 240
            C 220 260 206 288 192 350
            Z
          "
          fill="#1A3B32"
        />
        <g fill="#1A3B32">
          <path d="M 82 402.5 C 82 386.5 95.5 374.5 113 374.5 C 130.5 374.5 144 386.5 144 402.5 C 144 410 141.5 416.5 137.5 421 L 137.5 421 L 156.5 421 L 156.5 480 L 137.5 480 L 137.5 455 C 133 459 126.5 461.5 119 461.5 C 98.5 461.5 82 447.5 82 426.5 L 82 426.5 L 82 402.5 Z M 101 426.5 C 101 437 108 444 118 444 C 128 444 135 437 135 426.5 L 135 426.5 L 135 402.5 C 135 392 128 385 118 385 C 108 385 101 392 101 402.5 L 101 402.5 L 101 426.5 Z"/>
          <path d="M 163.5 374.5 L 182.5 374.5 L 182.5 411 C 182.5 422 188.5 428.5 199 428.5 C 209.5 428.5 215.5 422 215.5 411 L 215.5 374.5 L 234.5 374.5 L 234.5 412.5 C 234.5 433 222 443.5 202.5 443.5 C 191 443.5 182.5 439 177.5 430.5 L 177.5 430.5 L 177.5 442 L 163.5 442 L 163.5 374.5 Z"/>
          <path d="M 241.5 374.5 L 260.5 374.5 L 260.5 442 L 241.5 442 L 241.5 374.5 Z M 242.5 352.5 C 242.5 346 247.5 341 254 341 C 260.5 341 265.5 346 265.5 352.5 C 265.5 359 260.5 364 254 364 C 247.5 364 242.5 359 242.5 352.5 Z"/>
          <path d="M 272.5 344 L 291.5 344 L 291.5 442 L 272.5 442 L 272.5 344 Z"/>
          <path d="M 303.5 344 L 322.5 344 L 322.5 442 L 303.5 442 L 303.5 344 Z"/>
        </g>
      </svg>
    </div>
  );
}

// Animated version for splash screen - feather draw then text reveal left to right
export function QuillLogoAnimated({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        style={{ width: 180, height: 180 }}
      >
        {/* Circle background */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="absolute inset-0 rounded-full"
          style={{ background: "#1A3B32" }}
        />
        {/* Feather - draw animation */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          <defs>
            <clipPath id="feather-clip">
              <rect x="0" y="0" width="200" height="200" />
            </clipPath>
          </defs>
          <motion.g
            initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
            animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
          >
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
        </svg>
      </motion.div>

      {/* Text reveal left to right */}
      <div className="mt-6 overflow-hidden">
        <motion.div
          initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 1.1 }}
          className="flex"
          onAnimationComplete={onComplete}
        >
          <span className="font-display text-[56px] font-bold tracking-[-0.03em] leading-none" style={{ color: "#1A3B32", fontFamily: "var(--font-jakarta), sans-serif" }}>
            quill
          </span>
        </motion.div>
      </div>
    </div>
  );
}
