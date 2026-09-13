"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CandlestickChart,
  Feather,
  LayoutDashboard,
  Moon,
  NotebookPen,
  Plus,
  Settings,
  Star,
  Sun,
  WandSparkles,
} from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "@/components/providers";
import { Mimo } from "@/components/mimo";

const PAGES = [
  { href: "/today", label: "Today", icon: CalendarDays, hint: "Check-in and plan" },
  { href: "/", label: "Home", icon: LayoutDashboard, hint: "Dashboard" },
  { href: "/trades", label: "Trades", icon: CandlestickChart, hint: "Trade log" },
  { href: "/journal", label: "Journal", icon: Feather, hint: "Life + trade notes" },
  { href: "/journal/calendar", label: "Calendar", icon: CalendarDays, hint: "Entries by month" },
  { href: "/watchlist", label: "Watchlist", icon: Star, hint: "Symbols you track" },
  { href: "/intelligence", label: "Mimo", icon: WandSparkles, hint: "AI companion" },
  { href: "/insights", label: "Insights", icon: BarChart3, hint: "Behaviour patterns" },
  { href: "/performance", label: "Performance", icon: BarChart3, hint: "Stats and reviews" },
  { href: "/settings", label: "Settings", icon: Settings, hint: "Preferences and data" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { theme, setTheme, resolved } = useTheme();

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      className="top-[12%] left-1/2 z-[100] flex h-auto max-h-[70vh] w-[min(92vw,430px)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground quill-pop"
    >
      <Command>
      <div className="flex items-center gap-2 border-b border-border px-3.5 [&_svg]:h-4 [&_svg]:w-4">
        <CommandInput placeholder="Jump to a page or run an action…" className="h-12 bg-transparent text-sm" />
        <kbd className="pointer-events-none hidden h-5 shrink-0 items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:flex">
          esc
        </kbd>
      </div>
      <CommandList className="overflow-y-auto">
        <CommandEmpty className="py-8 text-[13px]">No matches. Try “trades” or “journal”.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/trades?new=1")} className="text-[13px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Plus className="h-3.5 w-3.5" />
            </span>
            Log a trade
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/journal?new=1")} className="text-[13px]">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
              <NotebookPen className="h-3.5 w-3.5" />
            </span>
            Write a journal entry
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
              onClose();
            }}
            className="text-[13px]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-soft text-primary">
              {resolved === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </span>
            Switch to {resolved === "dark" ? "light" : "dark"} mode
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Pages">
          {PAGES.map((p) => (
            <CommandItem key={p.href} value={p.label} onSelect={() => go(p.href)} className="text-[13px]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                {p.label === "Mimo" ? <Mimo size={16} compact /> : <p.icon className="h-3.5 w-3.5" />}
              </span>
              <span className="flex-1">{p.label}</span>
              <span className="text-[11px] text-muted-foreground">{p.hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
      <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-4 py-2 text-[10.5px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-card px-1 font-mono">↑</kbd>
          <kbd className="rounded border border-border bg-card px-1 font-mono">↓</kbd> navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded border border-border bg-card px-1 font-mono">↵</kbd> open
        </span>
        <span className="ml-auto flex items-center gap-1">
          <kbd className="rounded border border-border bg-card px-1 font-mono">⌘</kbd>
          <kbd className="rounded border border-border bg-card px-1 font-mono">K</kbd> toggle
        </span>
      </div>
      </Command>
    </CommandDialog>
  );
}
