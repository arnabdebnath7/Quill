"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

type Theme = "light" | "dark" | "system";
const ThemeCtx = createContext<{ theme: Theme; resolved: "light" | "dark"; setTheme: (t: Theme) => void }>({
  theme: "dark",
  resolved: "dark",
  setTheme: () => {},
});

function apply(theme: Theme) {
  const dark =
    theme === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches : theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  return dark ? "dark" : "light";
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("quill-theme") as Theme) ?? "dark";
    setThemeState(saved);
    setResolved(apply(saved));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setThemeState((cur) => {
        if (cur === "system") setResolved(apply("system"));
        return cur;
      });
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("quill-theme", t);
    setThemeState(t);
    setResolved(apply(t));
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return (
    <ThemeCtx.Provider value={value}>
      <QueryClientProvider client={client}>
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
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
