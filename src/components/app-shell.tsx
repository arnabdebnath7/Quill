"use client";
import { type ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Brain, CalendarDays, CandlestickChart, Feather, LayoutDashboard, LogOut, Monitor, PieChart, Plus, Settings, ShieldCheck, Star, Sun, Moon, X } from "lucide-react";
import { useTheme } from "@/components/providers";
import { Splash } from "@/components/splash";
import { AppInstall } from "@/components/app-install";
import { avatarHue, cn, initials } from "@/lib/utils";
import type { User } from "@/db/schema";

const NAV=[
  {href:"/today",label:"Today",icon:CalendarDays},
  {href:"/",label:"Home",icon:LayoutDashboard},
  {href:"/trades",label:"Trades",icon:CandlestickChart},
  {href:"/journal",label:"Journal",icon:Feather},
  {href:"/journal/calendar",label:"Calendar",icon:CalendarDays},
  {href:"/watchlist",label:"Watchlist",icon:Star},
  {href:"/insights",label:"Insights",icon:PieChart},
  {href:"/intelligence",label:"Memo",icon:Brain},
  {href:"/performance",label:"Performance",icon:BarChart3},
  {href:"/settings",label:"Settings",icon:Settings}
];
const MOBILE_NAV=[
  {href:"/today",label:"Today",icon:CalendarDays},
  {href:"/trades",label:"Trades",icon:CandlestickChart},
  {href:"/journal",label:"Journal",icon:Feather},
  {href:"/intelligence",label:"Memo",icon:Brain}
];
const QUICK=[
  {href:"/trades?new=1",label:"Log trade",icon:CandlestickChart},
  {href:"/journal?new=1",label:"Write",icon:Feather},
  {href:"/intelligence",label:"Memo",icon:Brain},
  {href:"/performance",label:"Performance",icon:BarChart3}
];

export function Logo({size=30}:{size?:number}){
  return <motion.div whileHover={{rotate:-4,scale:1.03}} whileTap={{scale:.94}} className="relative flex items-center justify-center rounded-[10px] bg-brandsolid text-brandon" style={{width:size,height:size}}><Feather style={{width:size*.52,height:size*.52}} strokeWidth={2.2}/></motion.div>
}

export function ThemeToggle(){
  const{theme,setTheme,resolved}=useTheme();
  const next=()=>setTheme(theme==="dark"?"light":theme==="light"?"system":"dark");
  return <motion.button whileTap={{scale:.88,rotate:-8}} onClick={next} title={`Theme: ${theme}`} aria-label={`Theme: ${theme}. Click to switch.`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-sub transition-all hover:bg-line/50 hover:text-ink cursor-pointer"><motion.span key={`${theme}-${resolved}`} initial={{rotate:-90,opacity:0,scale:.55}} animate={{rotate:0,opacity:1,scale:1}} transition={{type:"spring",bounce:.45,duration:.5}}>{theme==="system"?<Monitor className="h-[17px] w-[17px]"/>:resolved==="dark"?<Moon className="h-[17px] w-[17px]"/>:<Sun className="h-[17px] w-[17px]"/>}</motion.span></motion.button>
}

function UserChip({user}:{user:User}){
  const hue=avatarHue(user.email);
  return <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-2.5 py-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{background:`linear-gradient(135deg,hsl(${hue} 45% 42%),hsl(${(hue+40)%360} 45% 32%))`}}>{initials(user.name)}</div><div className="min-w-0"><div className="truncate text-[13px] font-medium leading-tight">{user.name}</div><div className="truncate text-[11px] text-faint leading-tight">{user.email}</div></div></div>
}

export function AppShell({user,children}:{user:User;children:ReactNode}){
  const pathname=usePathname();
  const router=useRouter();
  const[quickOpen,setQuickOpen]=useState(false);
  const signOut=async()=>{await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");router.refresh()};
  const isActive=(href:string)=>href==="/"?pathname==="/":href==="/journal"?pathname==="/journal":pathname.startsWith(href);

  return <div className="themed relative z-10 min-h-dvh bg-paper">
    <Splash/>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[224px] flex-col border-r border-line bg-paper/92 backdrop-blur-xl md:flex">
      <div className="flex items-center gap-2.5 px-5 pb-7 pt-6"><Logo/><div><div className="font-display text-[17px] font-semibold tracking-[-.02em] leading-none">Quill</div><div className="mt-1 text-[10px] uppercase tracking-[.14em] text-faint">trade & life</div></div></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main navigation">{NAV.map(item=>{const active=isActive(item.href);return <Link key={item.href} href={item.href} className={cn("group relative flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",active?"text-ink":"text-sub hover:text-ink")}>{active&&<motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border border-line bg-card" transition={{type:"spring",bounce:.14,duration:.45}}/>}<motion.span whileTap={{scale:.82}} className="relative z-10 flex"><item.icon className={cn("h-[17px] w-[17px] transition-colors",active?"text-brand":"text-faint group-hover:text-sub")} strokeWidth={active?2.1:1.8}/></motion.span><span className="relative z-10">{item.label}</span>{active&&<motion.span layoutId="nav-dot" className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-brand"/>}</Link>})}</nav>
      <div className="space-y-3 px-3 pb-5"><AppInstall/><div className="rounded-xl border border-line bg-card p-3"><div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-sub"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up"/>Live sync on</div><p className="text-[11px] leading-relaxed text-faint">Your journal and trades stay synced to Quill.</p></div><UserChip user={user}/><div className="flex items-center gap-2"><ThemeToggle/><motion.button whileTap={{scale:.985}} onClick={signOut} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-sub transition-colors hover:bg-line/50 hover:text-ink cursor-pointer"><LogOut className="h-4 w-4"/>Sign out</motion.button></div></div>
    </aside>

    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-line bg-paper/88 px-4 backdrop-blur-xl md:hidden">
      <Link href="/today" className="flex items-center gap-2.5"><Logo size={30}/><span className="font-display text-[17px] font-semibold tracking-[-.025em]">Quill</span></Link>
      <div className="flex items-center gap-2"><div className="hidden items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1.5 min-[390px]:flex"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-up"/><span className="text-[10px] font-medium text-faint">Synced</span></div><ThemeToggle/><button onClick={signOut} aria-label="Sign out" className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-sub hover:text-ink cursor-pointer"><LogOut className="h-4 w-4"/></button></div>
    </header>

    <div className="px-4 pt-3 md:hidden"><AppInstall/></div>
    <main className="px-4 pb-[calc(84px+env(safe-area-inset-bottom))] pt-5 sm:px-6 md:ml-[224px] md:px-10 md:pb-12 md:pt-8"><motion.div key={pathname} initial={{opacity:0,y:7}} animate={{opacity:1,y:0}} transition={{duration:.24,ease:[.22,1,.36,1]}} className="mx-auto w-full max-w-6xl">{children}</motion.div></main>

    <AnimatePresence>{quickOpen&&<><motion.button initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setQuickOpen(false)} className="fixed inset-0 z-40 bg-black/18 backdrop-blur-[2px] md:hidden" aria-label="Close quick actions"/><motion.div initial={{opacity:0,y:18,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:18,scale:.98}} transition={{duration:.2,ease:[.22,1,.36,1]}} className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-50 rounded-2xl border border-line bg-card p-3 shadow-2xl md:hidden"><div className="mb-2 flex items-center justify-between px-1"><div><div className="text-[13px] font-semibold">Quick actions</div><div className="mt-0.5 text-[10.5px] text-faint">Keep the important things one tap away.</div></div><button onClick={()=>setQuickOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl text-faint hover:bg-line/50"><X className="h-4 w-4"/></button></div><div className="grid grid-cols-2 gap-2">{QUICK.map(item=><Link key={item.href} href={item.href} onClick={()=>setQuickOpen(false)} className="flex min-h-[58px] items-center gap-3 rounded-xl border border-line bg-paper px-3 transition-colors hover:bg-line/40 active:scale-[.985]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand"><item.icon className="h-4 w-4"/></span><span className="text-[12px] font-medium">{item.label}</span></Link>)}</div></motion.div></>}</AnimatePresence>

    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/94 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Primary mobile navigation">
      <div className="relative mx-auto grid max-w-xl grid-cols-5">
        <div className="col-span-2 grid grid-cols-2">{MOBILE_NAV.slice(0,2).map(item=>{const active=isActive(item.href);return <Link key={item.href} href={item.href} className="relative flex min-h-16 flex-col items-center justify-center gap-1 py-2">{active&&<motion.span layoutId="mnav-left" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" transition={{type:"spring",bounce:.18,duration:.42}}/>}<motion.span whileTap={{scale:.78}} className="flex"><item.icon className={cn("h-[19px] w-[19px]",active?"text-brand":"text-faint")} strokeWidth={active?2.15:1.85}/></motion.span><span className={cn("text-[9px] font-medium",active?"text-ink":"text-faint")}>{item.label}</span></Link>})}</div>
        <div className="relative flex items-center justify-center"><motion.button whileTap={{scale:.9}} animate={quickOpen?{rotate:45}:{rotate:0}} transition={{type:"spring",stiffness:420,damping:24}} onClick={()=>setQuickOpen(v=>!v)} aria-label={quickOpen?"Close quick actions":"Open quick actions"} className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-paper bg-brandsolid text-brandon shadow-lg shadow-black/10"><Plus className="h-6 w-6" strokeWidth={2.25}/></motion.button></div>
        <div className="col-span-2 grid grid-cols-2">{MOBILE_NAV.slice(2,4).map(item=>{const active=isActive(item.href);return <Link key={item.href} href={item.href} className="relative flex min-h-16 flex-col items-center justify-center gap-1 py-2">{active&&<motion.span layoutId="mnav-right" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" transition={{type:"spring",bounce:.18,duration:.42}}/>}<motion.span whileTap={{scale:.78}} className="flex"><item.icon className={cn("h-[19px] w-[19px]",active?"text-brand":"text-faint")} strokeWidth={active?2.15:1.85}/></motion.span><span className={cn("text-[9px] font-medium",active?"text-ink":"text-faint")}>{item.label}</span></Link>})}</div>
      </div>
    </nav>
    <div className="sr-only" aria-live="polite"><ShieldCheck/></div>
  </div>
}
