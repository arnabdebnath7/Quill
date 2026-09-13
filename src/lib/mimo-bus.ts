import type { MimoState } from "@/components/mimo";

// Tiny pub/sub so any page (e.g. the chat) can drive the companion's state,
// which is rendered by the app shell's navigation.
type Listener = (s: MimoState) => void;
const listeners = new Set<Listener>();

export const mimoBus = {
  set(state: MimoState) {
    listeners.forEach((l) => l(state));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
