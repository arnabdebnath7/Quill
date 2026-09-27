"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers";

export function ThemeToggle() {
  const { theme, setTheme, resolved } = useTheme();
  const next = () => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.88, rotate: -8 }}
      onClick={next}
      title={`Theme: ${theme}`}
      aria-label={`Theme: ${theme}. Click to switch.`}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line text-sub transition-all hover:bg-line/50 hover:text-ink"
    >
      <motion.span
        key={`${theme}-${resolved}`}
        initial={{ rotate: -90, opacity: 0, scale: 0.55 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: "spring", bounce: 0.45, duration: 0.5 }}
      >
        <Icon className="h-[17px] w-[17px]" />
      </motion.span>
    </motion.button>
  );
}
