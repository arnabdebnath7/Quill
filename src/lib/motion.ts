// Shared motion system — one place to tune how the whole app moves.
import type { Transition, Variants } from "framer-motion";

/** Signature ease: fast out, soft landing. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const spring = {
  gentle: { type: "spring", stiffness: 320, damping: 30, mass: 0.7 } as Transition,
  snappy: { type: "spring", stiffness: 480, damping: 32, mass: 0.6 } as Transition,
  bouncy: { type: "spring", stiffness: 420, damping: 24, mass: 0.8 } as Transition,
};

/** Standard page entrance: fade + slight rise. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.16, ease: "easeIn" } },
};

/** Staggered container for card grids. */
export const staggerContainer = (stagger = 0.05, delay = 0): Variants => ({
  initial: {},
  animate: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

/** Single item rise-in used inside staggered containers. */
export const riseItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Scale-in for popovers / menus. */
export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2, ease: EASE } },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.14, ease: "easeIn" } },
};

/** Row sweep used for list items. */
export const rowIn: Variants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE } },
};
