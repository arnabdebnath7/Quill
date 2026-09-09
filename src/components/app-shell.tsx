"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, CandlestickChart, Feather, LayoutDashboard, LogOut, Monitor, Moon, PieChart, Settings, Star, Sun } from "lucide-react";
import { useTheme } from "@/components/providers";
import { Splash } from "@/components/splash";
import { avatarHue, cn, initials } from "@/lib/utils";
import type { User } from "@/db/schema";

const NAV = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: CandlestickChart },
  { href: "/journal", label: "Journal", icon: Feather },
  { href: "/watchlist", label: "Watchlist", icon: Star },
  { href: "/insights", label: "Insights", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Logo({ size = 30 }: { size?: number }) { return <motion.div whileHover={{ rotate: -5, scale: 1.04 }} whileTap={{ scale: .94 }} className="relative flex items-center justify-center rounded-[10px] bg-brandsolid text-brandon" style={{ width: size, height: size }}><Feather style={{ width: size * .52, height: size * .52 }} strokeWidth={2.2} /></motion.div>; }
export function ThemeToggle() { const { theme, setTheme, resolved } = useTheme(); const next = () => setTheme(theme === "dark" ? "light" : theme === "light" ? "system" : "dark"); return <motion.button whileTap={{ scale: .88, rotate: -8 }} whileHover={{ y: -1 }} onClick={next} title={`Theme: ${theme}`} aria-label={`Theme: ${theme}. Click to switch.`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-sub transition-all hover:bg-line/50 hover:text-ink cursor-pointer"><motion.span key={`${theme}-${resolved}`} initial={{ rotate: -90, opacity: 0, scale: .55 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: .45, duration: .5 }}>{theme === "system" ? <Monitor className="h-[17px] w-[17px]" /> : resolved === "dark" ? <Moon className="h-[17px] w-[17px]" /> : <Sun className="h-[17px] w-[17px]" />}</motion.span></motion.button>; }
function UserChip({ user }: { user: User }) { const hue = avatarHue(user.email); return <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-2.5 py-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: `linear-gradient(135deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 45% 32%))` }}>{initials(user.name)}</div><div className="min-w-0"><div className="truncate text-[13px] font-medium leading-tight">{user.name}</div><div className="truncate text-[11px] text-faint leading-tight">{user.email}</div></div></div>; }

export function AppShell({ user, children }: { user: User; children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const signOut = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); };
  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <div className="themed relative z-10 min-h-dvh">
    <Splash />
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-paper/80 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-7"><Logo /><div><div className="font-display text-[17px] font-semibold tracking-[-0.02em] leading-none">Quill</div><div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-faint">trade & life</div></div></div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">{NAV.map((item) => { const active = isActive(item.href); return <Link key={item.href} href={item.href} className={cn("group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors", active ? "text-ink" : "text-sub hover:text-ink")}>
        {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border border-line bg-card shadow-sm" transition={{ type: "spring", bounce: .14, duration: .5 }} />}<motion.span whileTap={{ scale: .82 }} className="relative z-10 flex"><item.icon className={cn("h-[17px] w-[17px] transition-colors", active ? "text-brand" : "text-faint group-hover:text-sub")} strokeWidth={active ? 2.2 : 1.9} /></motion.span><span className="relative z-10">{item.label}</span>{active && <motion.span layoutId="nav-dot" className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-brand" />}
      </Link>; })}</nav>
      <div className="space-y-3 px-3 pb-5"><div className="rounded-xl border border-line bg-card p-3"><div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-sub"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up" /> Live sync on</div><p className="text-[11px] leading-relaxed text-faint">Prices refresh automatically while you write.</p></div><UserChip user={user}/><div className="flex items-center gap-2"><ThemeToggle/><motion.button whileTap={{ scale: .985 }} onClick={signOut} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-sub transition-colors hover:bg-line/50 hover:text-ink cursor-pointer"><LogOut className="h-4 w-4"/> Sign out</motion.button></div></div>
    </aside>
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-paper/85 px-4 py-2.5 backdrop-blur-xl md:hidden"><Link href="/today" className="flex items-center gap-2"><Logo size={28}/><span className="font-display text-[16px] font-semibold tracking-[-0.02em]">Quill</span></Link><div className="flex items-center gap-1.5"><ThemeToggle/><motion.button whileTap={{ scale: .88, rotate: 5 }} onClick={signOut} aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-sub hover:text-ink cursor-pointer"><LogOut className="h-4 w-4"/></motion.button></div></header>
    <main className="px-4 pb-28 pt-6 sm:px-6 md:ml-[248px] md:px-10 md:pt-8 md:pb-12"><motion.div key={pathname} initial={{ opacity: 0, y: 8, scale: .995 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .28, ease: [0.22,1,0.36,1] }} className="mx-auto w-full max-w-6xl">{children}</motion.div></main>
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation"><div className="grid grid-cols-7">{NAV.map((item) => { const active = isActive(item.href); return <Link key={item.href} href={item.href} className="relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 py-2" aria-current={active ? "page" : undefined}>{active && <motion.span layoutId="mnav-pill" className="absolute -top-px h-0.5 w-7 rounded-full bg-brand" transition={{ type:"spring", bounce:.2, duration:.5 }}/>}<motion.span whileTap={{ scale: .78 }} animate={active ? { y: -1 } : { y: 0 }} className="flex"><item.icon className={cn("h-[18px] w-[18px]",active?"text-brand":"text-faint")} strokeWidth={active?2.2:1.9}/></motion.span><span className={cn("truncate max-w-full px-0.5 text-[8.5px] font-medium",active?"text-ink":"text-faint")}>{item.label}</span></Link>; })}</div></nav>
  </div>;
}
