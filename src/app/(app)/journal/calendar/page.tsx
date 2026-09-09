"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, isSameMonth, startOfMonth, subMonths } from "date-fns";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Feather, Pin, Sparkles } from "lucide-react";
import { useJournal } from "@/lib/hooks";
import { Button, Card, EmptyState, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

type Mood = "great" | "good" | "neutral" | "low" | "rough";
const MOOD_META: Record<Mood, { label: string; dot: string; tone: string }> = {
  great: { label: "Great", dot: "bg-up", tone: "text-up" },
  good: { label: "Good", dot: "bg-emerald-400", tone: "text-emerald-400" },
  neutral: { label: "Neutral", dot: "bg-line-strong", tone: "text-sub" },
  low: { label: "Low", dot: "bg-amber-500", tone: "text-amber-500" },
  rough: { label: "Rough", dot: "bg-down", tone: "text-down" },
};
function localToday() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
type CalendarCell = Date | null;

export default function JournalCalendarPage() {
  const [month, setMonth] = useState(localToday());
  const [selected, setSelected] = useState(localToday());
  const { data: entries, isLoading } = useJournal();
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leading = monthStart.getDay();
  const padded: CalendarCell[] = [...Array.from<CalendarCell>({ length: leading }, () => null), ...days];
  const entryMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof entries>>();
    for (const entry of entries ?? []) { const key = entry.date; const list = map.get(key) ?? []; list.push(entry); map.set(key, list); }
    return map;
  }, [entries]);
  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedEntries = entryMap.get(selectedKey) ?? [];
  const onThisDay = useMemo(() => { const mm = format(selected, "MM-dd"); return (entries ?? []).filter((e) => e.date.slice(5) === mm).sort((a, b) => b.date.localeCompare(a.date)); }, [entries, selected]);
  const monthEntries = useMemo(() => (entries ?? []).filter((e) => e.date >= format(monthStart, "yyyy-MM-dd") && e.date <= format(monthEnd, "yyyy-MM-dd")), [entries, monthStart, monthEnd]);
  const moodCounts = useMemo(() => { const counts: Record<Mood, number> = { great: 0, good: 0, neutral: 0, low: 0, rough: 0 }; monthEntries.forEach((e) => { if (e.mood && e.mood in counts) counts[e.mood as Mood]++; }); return counts; }, [monthEntries]);
  if (isLoading) return <div className="space-y-5"><Skeleton className="h-10 w-72" /><div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><Skeleton className="h-[620px]" /><Skeleton className="h-[620px]" /></div></div>;
  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand"><CalendarDays className="h-3.5 w-3.5" /> Memory layer</div><h1 className="mt-1.5 font-display text-[29px] font-semibold tracking-[-0.03em]">Journal calendar.</h1><p className="mt-1 text-[13px] text-faint">See the life behind the log — one day at a time.</p></div><div className="flex gap-2"><Link href="/journal"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Journal</Button></Link><Link href="/journal?new=1"><Button><Feather className="h-4 w-4" /> Write</Button></Link></div></header>
    <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><Card className="p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><div className="font-display text-[20px] font-semibold">{format(month, "MMMM yyyy")}</div><div className="mt-0.5 text-[11.5px] text-faint">{monthEntries.length} entries this month</div></div><div className="flex gap-1.5"><Button variant="ghost" className="h-10 w-10 p-0" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" className="h-10 px-3" onClick={() => { const now = localToday(); setMonth(now); setSelected(now); }}>Today</Button><Button variant="ghost" className="h-10 w-10 p-0" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button></div></div>
      <div className="mt-5 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => <div key={d} className="py-2">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{padded.map((day, i) => { if (!day) return <div key={`empty-${i}`} className="min-h-[74px] rounded-xl sm:min-h-[88px]" />; const key = format(day, "yyyy-MM-dd"); const dayEntries = entryMap.get(key) ?? []; const mood = dayEntries.find((e) => e.mood)?.mood as Mood | undefined; const active = isSameDay(day, selected); const currentMonth = isSameMonth(day, month); return <button type="button" key={key} onClick={() => setSelected(day)} className={cn("min-h-[74px] rounded-xl border p-2 text-left transition-all sm:min-h-[88px]", active ? "border-brand bg-brand-soft shadow-sm" : "border-line bg-paper hover:bg-card", !currentMonth && "opacity-40")}><div className="flex items-center justify-between"><span className={cn("text-[11px] font-semibold tabular", active ? "text-brand" : "text-sub")}>{format(day, "d")}</span>{dayEntries.some((e) => e.pinned) && <Pin className="h-3 w-3 text-brand" />}</div><div className="mt-2 space-y-1">{dayEntries.slice(0, 2).map((e) => <div key={e.id} className="truncate text-[10px] text-faint">{e.title}</div>)}</div><div className="mt-2 flex items-center gap-1.5">{dayEntries.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}{mood && <span className={cn("h-1.5 w-1.5 rounded-full", MOOD_META[mood].dot)} />}</div></button>; })}</div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-[10.5px] text-faint"><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-brand" /> entry</span>{Object.entries(MOOD_META).map(([key, meta]) => <span key={key} className="flex items-center gap-1.5"><span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {meta.label}</span>)}</div></Card>
      <div className="space-y-4"><Card className="p-5"><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-faint"><Sparkles className="h-3.5 w-3.5 text-brand" /> {format(selected, "EEEE, MMMM d")}</div>{selectedEntries.length ? <div className="mt-4 space-y-3">{selectedEntries.map((e) => <Link key={e.id} href="/journal" className="block rounded-2xl border border-line bg-paper p-3.5 transition-colors hover:bg-card"><div className="flex items-center justify-between gap-2"><div className="font-display text-[15px] font-semibold">{e.title}</div>{e.mood && <span className={cn("text-[10px] font-semibold", MOOD_META[e.mood as Mood]?.tone)}>{MOOD_META[e.mood as Mood]?.label}</span>}</div><p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-sub">{e.content}</p></Link>)}</div> : <p className="mt-4 text-[12.5px] leading-relaxed text-faint">Nothing written on this day yet. That blank space is yours.</p>}</Card><Card className="p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-brand" /><h2 className="font-display text-[16px] font-semibold">On this day</h2></div>{onThisDay.length > 1 ? <div className="space-y-3">{onThisDay.slice(0, 5).map((e) => <div key={e.id} className="rounded-2xl bg-paper p-3.5"><div className="flex items-center justify-between gap-2"><span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-faint">{format(new Date(e.date + "T12:00:00"), "yyyy")}</span>{e.pinned && <Pin className="h-3 w-3 text-brand" />}</div><div className="mt-1 font-display text-[15px] font-semibold">{e.title}</div><p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-sub">{e.content}</p></div>)}</div> : <p className="text-[12.5px] leading-relaxed text-faint">As your archive grows, Quill will surface what you wrote on this date in past years.</p>}</Card><Card className="p-5"><div className="mb-4 font-display text-[16px] font-semibold">Mood this month</div><div className="space-y-2.5">{(Object.entries(MOOD_META) as [Mood, typeof MOOD_META[Mood]][]).map(([key, meta]) => { const count = moodCounts[key]; const total = monthEntries.length || 1; return <div key={key}><div className="flex items-center justify-between text-[11.5px]"><span className={cn("font-medium", meta.tone)}>{meta.label}</span><span className="text-faint">{count}</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/60"><div className={cn("h-full rounded-full", meta.dot)} style={{ width: `${Math.min(100, (count / total) * 100)}%` }} /></div></div>; })}</div></Card></div></div>
    {(entries ?? []).length === 0 && <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Your memory archive starts here" body="Write one honest entry and this calendar becomes a living timeline." action={<Link href="/journal?new=1"><Button><Feather className="h-4 w-4" /> Write first entry</Button></Link>} />}
  </div>;
}
