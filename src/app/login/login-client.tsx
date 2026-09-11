"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FirebaseError } from "firebase/app";
import { Activity, BookOpenText, Globe2, ShieldCheck } from "lucide-react";
import { Logo, ThemeToggle } from "@/components/app-shell";
import { consumeRedirectResult, signInWithGoogle, SignInCancelled } from "@/lib/firebase";

function GoogleMark(){return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden><path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"/><path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1Z"/><path fill="#EA4335" d="M12 4.76c1.76 0 3.35.6 4.59 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76Z"/></svg>}
const FEATURES=[{icon:Activity,label:"Live prices, 5 markets"},{icon:BookOpenText,label:"Trades + life in one journal"},{icon:Globe2,label:"US · India · FX · Crypto · Gold"},{icon:ShieldCheck,label:"Private by default"}];
const EASE=[0.22,1,0.36,1] as const;
function friendlyError(e:unknown){if(e instanceof FirebaseError){switch(e.code){case"auth/unauthorized-domain":return"This domain isn't whitelisted yet — add it under Firebase Console → Auth → Authorized domains.";case"auth/operation-not-allowed":return"Google provider is disabled — enable it in Firebase Console → Auth → Sign-in method.";case"auth/network-request-failed":return"Network hiccup reaching Google. Check your connection and retry.";case"auth/too-many-requests":return"Too many attempts. Give it a minute and try again.";default:return`Google sign-in failed (${e.code.replace("auth/","")}).`;}}return e instanceof Error?e.message:"Something went wrong. Please try again.";}

function QuillCompanion(){
  return <motion.div
    initial={{opacity:0,y:12,scale:.96}}
    animate={{opacity:1,y:0,scale:1}}
    transition={{delay:.08,duration:.65,ease:EASE}}
    className="relative mx-auto mb-6 w-[156px] sm:w-[174px]"
    aria-label="Quill's fox companion"
  >
    <motion.div
      animate={{y:[0,-4,0],rotate:[0,-.8,0,.8,0]}}
      transition={{duration:4.8,repeat:Infinity,ease:"easeInOut"}}
      className="relative"
    >
      <div className="absolute inset-x-7 bottom-2 h-8 rounded-full bg-brand/10 blur-xl" aria-hidden />
      <svg viewBox="0 0 220 220" className="relative h-auto w-full" role="img">
        <defs>
          <linearGradient id="qfox" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="var(--brand-solid)"/><stop offset="100%" stopColor="var(--brand)"/></linearGradient>
        </defs>
        <motion.g animate={{rotate:[0,1.2,0,-1.2,0]}} transition={{duration:5.4,repeat:Infinity,ease:"easeInOut"}} style={{transformOrigin:"110px 122px"}}>
          <path d="M154 160c30 8 43 25 34 38-7 10-23 5-29-8-5-10-7-18-16-24" fill="none" stroke="url(#qfox)" strokeWidth="15" strokeLinecap="round"/>
          <path d="M82 153c-24 16-35 33-26 43 8 8 22 1 28-10 6-12 8-19 13-28" fill="none" stroke="url(#qfox)" strokeWidth="14" strokeLinecap="round"/>
          <path d="M62 83 46 39c-4-11 8-18 18-11l34 29Z" fill="url(#qfox)"/>
          <path d="M158 83l16-44c4-11-8-18-18-11l-34 29Z" fill="url(#qfox)"/>
          <path d="M72 71c17-25 58-31 84-10 15 12 24 32 24 57 0 43-30 73-70 73s-70-30-70-73c0-21 8-38 32-47Z" fill="url(#qfox)"/>
          <path d="M61 75 49 49l27 19Z" fill="var(--brand-on)" opacity=".48"/>
          <path d="M159 67l24-18-12 28Z" fill="var(--brand-on)" opacity=".38"/>
          <motion.g animate={{scaleY:[1,1,.12,1,1]}} transition={{duration:4.1,repeat:Infinity,times:[0,.43,.445,.47,1],ease:"easeInOut"}} style={{transformOrigin:"84px 113px"}}>
            <ellipse cx="84" cy="113" rx="7" ry="9" fill="var(--brand-on)"/>
          </motion.g>
          <motion.g animate={{scaleY:[1,1,.12,1,1]}} transition={{duration:4.1,repeat:Infinity,times:[0,.43,.445,.47,1],ease:"easeInOut"}} style={{transformOrigin:"136px 113px"}}>
            <ellipse cx="136" cy="113" rx="7" ry="9" fill="var(--brand-on)"/>
          </motion.g>
          <circle cx="84" cy="114" r="2.1" fill="var(--brand-solid)"/>
          <circle cx="136" cy="114" r="2.1" fill="var(--brand-solid)"/>
          <path d="M103 129q7 6 14 0" stroke="var(--brand-on)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
          <path d="M98 144q12 8 24 0" stroke="var(--brand-on)" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".5"/>
          <path d="M93 166q17 9 34 0" stroke="var(--brand-on)" strokeWidth="4" strokeLinecap="round" fill="none" opacity=".28"/>
          <path d="M108 174v18" stroke="var(--brand-on)" strokeWidth="4" strokeLinecap="round" opacity=".55"/>
        </motion.g>
        <motion.g animate={{x:[0,2,0]}} transition={{duration:3.2,repeat:Infinity,ease:"easeInOut"}}>
          <path d="M177 150c9 1 16 7 19 14" stroke="var(--brand-on)" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
          <circle cx="197" cy="165" r="3" fill="var(--brand-solid)" opacity=".7"/>
        </motion.g>
      </svg>
    </motion.div>
    <motion.p initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} transition={{delay:.42,duration:.45,ease:EASE}} className="mt-1 text-center text-[11px] font-medium tracking-[.08em] text-faint uppercase">Quill companion</motion.p>
  </motion.div>;
}

export function LoginClient(){const router=useRouter();const[phase,setPhase]=useState<"idle"|"google"|"guest"|"exchange">("idle");const[error,setError]=useState<string|null>(null);const busy=phase!=="idle";const exchange=useCallback(async(idToken:string)=>{setPhase("exchange");const res=await fetch("/api/auth/google",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken})});if(!res.ok){const json=await res.json().catch(()=>({}));throw new Error(json.error??"Sign-in verification failed.");}router.replace("/");router.refresh();},[router]);useEffect(()=>{let dead=false;consumeRedirectResult().then(token=>{if(dead||!token)return;exchange(token).catch(e=>{if(!dead){setError(friendlyError(e));setPhase("idle");}})}).catch(e=>{if(!dead)setError(friendlyError(e));});return()=>{dead=true;};},[exchange]);const signIn=async()=>{setError(null);setPhase("google");try{await exchange(await signInWithGoogle());}catch(e){if(e instanceof SignInCancelled){setPhase("idle");return;}setError(friendlyError(e));setPhase("idle");}};const enterAsGuest=async()=>{setError(null);setPhase("guest");try{const res=await fetch("/api/auth/guest",{method:"POST"});const json=await res.json().catch(()=>({}));if(!res.ok)throw new Error(json.error??"Guest access failed. Please try again.");router.replace("/");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Guest access failed. Please try again.");setPhase("idle");}};return <div className="relative z-10 flex min-h-dvh flex-col"><div className="absolute right-4 top-4"><ThemeToggle/></div><div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:py-14"><QuillCompanion/><motion.div initial={{scale:.75,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:.16,type:"spring",bounce:.3,duration:.75}} className="mx-auto w-fit"><Logo size={46}/></motion.div><motion.h1 initial={{y:18,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.23,duration:.6,ease:EASE}} className="mt-5 text-center font-display text-[31px] font-semibold leading-[1.08] tracking-[-.03em] sm:text-[44px]">Your trades.<br/>Your days. <span className="text-brand">One journal.</span></motion.h1><motion.p initial={{y:16,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.31,duration:.6,ease:EASE}} className="mt-4 max-w-[390px] text-center text-[14.5px] leading-relaxed text-sub">A real private workspace for your trades, notes and behavioural intelligence — built to run like a focused app, not a demo.</motion.p><motion.div initial={{y:16,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.39,duration:.6,ease:EASE}} className="mt-8 flex w-full max-w-[320px] flex-col items-center gap-3"><button onClick={signIn} disabled={busy} className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-full border border-linestrong bg-card text-[14.5px] font-medium shadow-[var(--shadow)] transition-all hover:shadow-lg active:scale-[.98] disabled:opacity-70 cursor-pointer">{busy?<motion.span className="h-[18px] w-[18px] rounded-full border-2 border-line border-t-brand" animate={{rotate:360}} transition={{repeat:Infinity,duration:.7,ease:"linear"}}/>:<GoogleMark/>}{phase==="exchange"?"Opening your workspace…":phase==="google"?"Waiting for Google…":phase==="guest"?"Opening private workspace…":"Continue with Google"}</button><button onClick={enterAsGuest} disabled={busy} className="h-11 w-full rounded-full border border-line bg-transparent px-4 text-[13.5px] font-medium text-sub transition-colors hover:bg-card hover:text-ink active:scale-[.98] disabled:opacity-60 cursor-pointer">Enter as a private workspace</button>{error&&<motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className="max-w-[310px] text-center text-[12px] leading-relaxed text-down">{error}</motion.p>}<p className="text-center text-[11.5px] leading-relaxed text-faint">Google keeps your account synced. Private workspace starts clean — no seeded demo trades or journal history.</p></motion.div><motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.58,duration:.8}} className="mt-10 grid max-w-[520px] grid-cols-2 gap-2.5 sm:mt-12 sm:grid-cols-4">{FEATURES.map((f,i)=><motion.div key={f.label} initial={{y:14,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.58+i*.08,duration:.5,ease:EASE}} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card px-3 py-4 text-center"><f.icon className="h-4 w-4 text-brand"/><span className="text-[11px] font-medium leading-tight text-sub">{f.label}</span></motion.div>)}</motion.div></div><motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.78}} className="pb-6 text-center text-[11px] text-faint">Quill — a journal that trades as hard as you do.</motion.p></div>}
