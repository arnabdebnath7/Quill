"use client";
import { type ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  CandlestickChart,
  Feather,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  WandSparkles,
} from "lucide-react";
import { useTheme } from "@/components/providers";
import { Splash } from "@/components/splash";
import { AppInstall } from "@/components/app-install";
import { CommandPalette } from "@/components/command-palette";
import { Mimo, type MimoState } from "@/components/mimo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, initials } from "@/lib/utils";
import { EASE, spring } from "@/lib/motion";
import { mimoBus } from "@/lib/mimo-bus";
import type { User } from "@/db/schema";

/* ------------------------------- brand ------------------------------- */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <motion.span
      whileHover={{ rotate: -5, scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      transition={spring.bouncy}
      className="flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
      style={{ width: size, height: size }}
    >
      <Feather style={{ width: size * 0.52, height: size * 0.52 }} strokeWidth={2.2} />
    </motion.span>
  );
}

/* ---------------------------- theme toggle ---------------------------- */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolved } = useTheme();
  const next = () => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark");
  const Icon = theme === "system" ? Monitor : resolved === "dark" ? Moon : Sun;
  return (
    <motion.button
      whileTap={{ scale: 0.88, rotate: -10 }}
      onClick={next}
      title={`Theme: ${theme}`}
      aria-label={`Theme: ${theme}. Click to switch.`}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer",
        className,
      )}
    >
      <motion.span
        key={`${theme}-${resolved}`}
        initial={{ rotate: -90, opacity: 0, scale: 0.55 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={spring.bouncy}
      >
        <Icon className="h-[17px] w-[17px]" />
      </motion.span>
    </motion.button>
  );
}

/* ------------------------------ nav model ----------------------------- */
type NavItem = { href: string; label: string; icon: React.ElementType };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Daily",
    items: [
      { href: "/today", label: "Today", icon: CalendarDays },
      { href: "/", label: "Home", icon: LayoutDashboard },
    ],
  },
  {
    label: "Trading",
    items: [
      { href: "/trades", label: "Trades", icon: CandlestickChart },
      { href: "/watchlist", label: "Watchlist", icon: Star },
    ],
  },
  {
    label: "Review",
    items: [
      { href: "/journal", label: "Journal", icon: NotebookPen },
      { href: "/journal/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/performance", label: "Performance", icon: BarChart3 },
      { href: "/insights", label: "Insights", icon: WandSparkles },
    ],
  },
  {
    label: "Companion",
    items: [{ href: "/intelligence", label: "Mimo", icon: Mimo }],
  },
];

const MOBILE_NAV: NavItem[] = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/trades", label: "Trades", icon: CandlestickChart },
  { href: "/journal", label: "Journal", icon: NotebookPen },
  { href: "/intelligence", label: "Mimo", icon: Mimo },
];

const QUICK_ACTIONS: NavItem[] = [
  { href: "/trades?new=1", label: "Log trade", icon: Plus },
  { href: "/journal?new=1", label: "Write entry", icon: NotebookPen },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/journal/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/performance", label: "Performance", icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: WandSparkles },
  { href: "/settings", label: "Settings", icon: Settings },
];

function UserChip({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          initials(user.name)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-tight">{user.name}</span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">{user.email}</span>
      </span>
    </div>
  );
}

function NavRow({ item, active, state }: { item: NavItem; active: boolean; state: MimoState }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0 rounded-lg border border-border bg-card shadow-sm"
          transition={spring.gentle}
        />
      )}
      <span className="relative z-10 flex h-[17px] w-[17px] items-center justify-center">
        {Icon === Mimo ? (
          <Mimo size={20} compact state={state} />
        ) : (
          <Icon className={cn("h-[17px] w-[17px] transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={active ? 2.1 : 1.8} />
        )}
      </span>
      <span className="relative z-10">{item.label}</span>
      {active && <motion.span layoutId="nav-dot" className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-primary" transition={spring.gentle} />}
    </Link>
  );
}

/* ------------------------------- shell ------------------------------- */
export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [mimoState, setMimoState] = useState<MimoState>("idle");

  useEffect(() => {
    const open = () => setCmdOpen(true);
    window.addEventListener("quill:open-command", open);
    const unsub = mimoBus.subscribe(setMimoState);
    return () => {
      window.removeEventListener("quill:open-command", open);
      unsub();
    };
  }, []);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="relative z-10 min-h-dvh bg-background">
      <Splash />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* ------------------------- desktop sidebar ------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-5">
          <Logo size={32} />
          <div>
            <div className="font-display text-[16px] font-semibold leading-none tracking-[-0.02em]">Quill</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">trade & life</div>
          </div>
        </div>

        {/* search / command trigger */}
        <div className="px-3">
          <button
            onClick={() => setCmdOpen(true)}
            className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent/70 cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Jump to…</span>
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </button>
        </div>

        {/* nav */}
        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavRow key={item.href} item={item} active={isActive(item.href)} state={mimoState} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* footer */}
        <div className="space-y-3 px-3 pb-4">
          <AppInstall />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-card p-2 pr-2.5 text-left transition-colors hover:bg-accent/70"
                  aria-label="Account menu"
                >
                  <UserChip user={user} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <UserChip user={user} />
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2 text-[13px]">
                    <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="flex items-center gap-2 text-[13px] text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* -------------------------- mobile top bar ------------------------- */}
      <header className="sticky top-0 z-40 flex h-[58px] items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl md:hidden">
        <Link href="/today" className="flex items-center gap-2.5">
          <Logo size={30} />
          <span className="font-display text-[16px] font-semibold tracking-[-0.025em]">Quill</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 min-[390px]:flex">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" />
            <span className="text-[10px] font-medium text-muted-foreground">Synced</span>
          </span>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-primary-soft text-[11px] font-semibold text-primary"
                aria-label="Account menu"
              >
                {initials(user.name)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <UserChip user={user} />
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2 text-[13px]">
                  <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} className="flex items-center gap-2 text-[13px] text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="px-4 pt-3 md:hidden">
        <AppInstall />
      </div>

      {/* ------------------------------ main ------------------------------- */}
      <main className="px-4 pb-[calc(92px+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:ml-[248px] md:px-8 md:pb-12 md:pt-8 lg:px-10">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
          className="mx-auto w-full max-w-6xl"
        >
          {children}
        </motion.div>
      </main>

      {/* ------------------------ quick actions sheet ----------------------- */}
      <Sheet open={quickOpen} onOpenChange={setQuickOpen}>
        <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border px-5 pb-4 pt-4 text-left">
            <SheetTitle className="text-[15px]">Quick actions</SheetTitle>
            <p className="text-[12px] text-muted-foreground">The important things, one tap away.</p>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 p-4">
            {QUICK_ACTIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setQuickOpen(false)}
                className="flex min-h-[60px] items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/70 active:scale-[0.985]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-[12.5px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* --------------------------- mobile bottom nav ---------------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        aria-label="Primary mobile navigation"
      >
        <div className="relative mx-auto grid max-w-xl grid-cols-5">
          {MOBILE_NAV.slice(0, 2).map((item) => (
            <MobileTab key={item.href} item={item} active={isActive(item.href)} state={mimoState} />
          ))}
          <div className="relative flex items-start justify-center">
            <motion.button
              whileTap={{ scale: 0.9 }}
              animate={quickOpen ? { rotate: 45 } : { rotate: 0 }}
              transition={spring.snappy}
              onClick={() => setQuickOpen((v) => !v)}
              aria-label={quickOpen ? "Close quick actions" : "Open quick actions"}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg shadow-black/20 cursor-pointer"
            >
              <Plus className="h-6 w-6" strokeWidth={2.4} />
            </motion.button>
          </div>
          {MOBILE_NAV.slice(2).map((item) => (
            <MobileTab key={item.href} item={item} active={isActive(item.href)} state={mimoState} />
          ))}
        </div>
      </nav>

    </div>
  );
}

function MobileTab({ item, active, state }: { item: NavItem; active: boolean; state: MimoState }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className="relative flex min-h-[64px] flex-col items-center justify-center gap-1 py-2">
      {active && (
        <motion.span layoutId="mnav-bar" className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" transition={spring.gentle} />
      )}
      <motion.span whileTap={{ scale: 0.78 }} className="flex h-[22px] w-[22px] items-center justify-center">
        {Icon === Mimo ? (
          <Mimo size={22} compact state={state} />
        ) : (
          <Icon className={cn("h-[22px] w-[22px]", active ? "text-primary" : "text-muted-foreground")} strokeWidth={active ? 2.15 : 1.85} />
        )}
      </motion.span>
      <span className={cn("text-[9.5px] font-medium", active ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
    </Link>
  );
}
