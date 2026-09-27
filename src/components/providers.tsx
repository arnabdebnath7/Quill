"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "quill-theme";
const DEFAULT_THEME: Theme = "dark";
const MEDIA_QUERY = "(prefers-color-scheme: dark)";

/* ---------- theme store (localStorage + system preference) ---------- */

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function readTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "light" || raw === "dark" || raw === "system" ? raw : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function resolve(theme: Theme): ResolvedTheme {
  if (theme !== "system") return theme;
  return window.matchMedia(MEDIA_QUERY).matches ? "dark" : "light";
}

function snapshot(): string {
  const theme = readTheme();
  return `${theme}:${resolve(theme)}`;
}

function serverSnapshot(): string {
  return `${DEFAULT_THEME}:${DEFAULT_THEME}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(MEDIA_QUERY);
  media.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
  };
}

function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled — the theme still applies for this page load.
  }
  notify();
}

/** Hook consumed by the toggle and anything that needs to know the active theme. */
export function useTheme() {
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [theme, resolved] = state.split(":") as [Theme, ResolvedTheme];

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    window.setTimeout(() => root.classList.remove("theme-switching"), 360);
    writeTheme(next);
  }, []);

  return useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
}

/** Keeps the `dark` class on <html> in sync with the store (the inline boot script handles first paint). */
function ThemeSync() {
  const { resolved } = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
  }, [resolved]);
  return null;
}

/* ---------- providers ---------- */

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false } } }),
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--card)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow)",
            fontFamily: "var(--font-inter), sans-serif",
          },
        }}
      />
    </QueryClientProvider>
  );
}
