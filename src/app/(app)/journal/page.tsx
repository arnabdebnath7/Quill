"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  CloudRain,
  Feather,
  Frown,
  Laugh,
  Meh,
  PenLine,
  Pin,
  PinOff,
  Search,
  Smile,
  Trash2,
} from "lucide-react";
import { useCreateEntry, useDeleteEntry, useJournal, useUpdateEntry } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button, Dialog, EmptyState, Field, Input, Select, Textarea, Skeleton, Badge } from "@/components/ui";
import type { JournalEntry } from "@/db/schema";

const EASE = [0.22, 1, 0.36, 1] as const;

const MOODS: Record<string, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  great: { icon: Laugh, label: "Great", color: "text-up", bg: "bg-up-soft" },
  good: { icon: Smile, label: "Good", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  neutral: { icon: Meh, label: "Neutral", color: "text-faint", bg: "bg-line/50" },
  low: { icon: Frown, label: "Low", color: "text-amber-500", bg: "bg-amber-500/10" },
  rough: { icon: CloudRain, label: "Rough", color: "text-down", bg: "bg-down-soft" },
};

function JournalInner() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [mood, setMood] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [reading, setReading] = useState<JournalEntry | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleting, setDeleting] = useState<JournalEntry | null>(null);

  const { data: entries, isLoading } = useJournal({ q: debouncedQ, mood });
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  useEffect(() => {
    if (params.get("new") === "1") {
      setReading(null);
      setEditMode(false);
      setEditorOpen(true);
    }
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const grouped = useMemo(() => {
    const list = entries ?? [];
    const groups = new Map<string, JournalEntry[]>();
    list.forEach((e) => {
      const key = format(new Date(e.date + "T12:00:00"), "MMMM yyyy");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    });
    return [...groups.entries()];
  }, [entries]);

  const streak = useMemo(() => {
    const days = new Set((entries ?? []).map((e) => e.date));
    let s = 0;
    const c = new Date();
    if (!days.has(c.toISOString().slice(0, 10))) c.setDate(c.getDate() - 1);
    while (days.has(c.toISOString().slice(0, 10))) {
      s++;
      c.setDate(c.getDate() - 1);
    }
    return s;
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">Journal</h1>
          <p className="mt-1 text-[13px] text-sub">
            {entries?.length ?? 0} entries{streak > 0 && <> · <span className="font-medium text-brand">{streak}-day streak</span></>} · the market analysis is free, the self-knowledge is priceless
          </p>
        </div>
        <Button onClick={() => { setReading(null); setEditMode(false); setEditorOpen(true); }}>
          <Feather className="h-4 w-4" /> New entry
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input className="pl-10" placeholder="Search your mind…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select className="sm:w-44" value={mood} onChange={(e) => setMood(e.target.value)}>
          <option value="all">All moods</option>
          {Object.entries(MOODS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={i % 3 === 0 ? "h-44" : "h-32"} />)}
        </div>
      ) : (entries ?? []).length === 0 ? (
        <EmptyState
          icon={<Feather className="h-5 w-5" />}
          title={debouncedQ || mood !== "all" ? "Nothing matches" : "A blank page is a good sign"}
          body={debouncedQ || mood !== "all" ? "Try a different search or mood filter." : "Five honest sentences a day beats a perfect essay once a month. Start with today."}
          action={!(debouncedQ || mood !== "all") && <Button onClick={() => setEditorOpen(true)}><Feather className="h-4 w-4" /> Write today's entry</Button>}
        />
      ) : (
        <div className="space-y-7">
          {grouped.map(([month, list]) => (
            <section key={month}>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">{month}</div>
              <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
                <AnimatePresence initial={false}>
                  {list.map((e) => (
                    <motion.article
                      layout
                      key={e.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="mb-4 break-inside-avoid"
                    >
                      <button
                        onClick={() => { setReading(e); setEditMode(false); }}
                        className="block w-full rounded-2xl border border-line bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 text-[11px] text-faint">
                            <span className="tabular">{format(new Date(e.date + "T12:00:00"), "EEE, MMM d")}</span>
                            {e.pinned && <Pin className="h-3 w-3 text-brand" />}
                          </div>
                          {e.mood && MOODS[e.mood] && (
                            <span className={cn("flex h-6 w-6 items-center justify-center rounded-lg", MOODS[e.mood].bg)}>
                              {(() => { const I = MOODS[e.mood!].icon; return <I className={cn("h-3.5 w-3.5", MOODS[e.mood!].color)} />; })()}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-display text-[16px] font-semibold leading-snug tracking-[-0.01em]">{e.title}</h3>
                        <p className="mt-2 line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-sub">{e.content}</p>
                        {e.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {e.tags.slice(0, 4).map((t) => <Badge key={t}>#{t}</Badge>)}
                          </div>
                        )}
                      </button>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Reader / edit dialog */}
      <EntryDialog
        open={reading != null && !editorOpen}
        entry={reading}
        editMode={editMode}
        setEditMode={setEditMode}
        onClose={() => setReading(null)}
        onDelete={() => { setDeleting(reading); }}
      />

      {/* New entry dialog */}
      <EntryDialog
        open={editorOpen}
        entry={null}
        editMode
        setEditMode={() => {}}
        onClose={() => setEditorOpen(false)}
        onDelete={() => {}}
      />

      <Dialog open={deleting != null} onClose={() => setDeleting(null)} title="Delete this entry?">
        <p className="text-[13.5px] leading-relaxed text-sub">
          “{deleting?.title}” will be gone for good. Memories fade — that's why you write them down. Sure?
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Keep it</Button>
          <Button
            variant="danger"
            loading={deleteEntry.isPending}
            onClick={async () => {
              if (!deleting) return;
              await deleteEntry.mutateAsync(deleting.id).catch(() => {});
              setDeleting(null);
              setReading(null);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function EntryDialog({
  open,
  entry,
  editMode,
  setEditMode,
  onClose,
  onDelete,
}: {
  open: boolean;
  entry: JournalEntry | null;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const isNew = entry == null;
  if (!open && entry == null && isNew) {
    // still render for creation
  }
  return (
    <Dialog open={open} onClose={onClose} title={isNew ? "New entry" : editMode ? "Edit entry" : "Journal entry"} wide>
      {isNew || editMode ? (
        <EntryEditor entry={entry} onClose={onClose} />
      ) : entry ? (
        <div>
          <div className="flex items-center gap-2 text-[12px] text-faint">
            <span className="tabular">{format(new Date(entry.date + "T12:00:00"), "EEEE, MMMM d, yyyy")}</span>
            {entry.mood && MOODS[entry.mood] && (
              <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", MOODS[entry.mood].bg, MOODS[entry.mood].color)}>
                {(() => { const I = MOODS[entry.mood!].icon; return <I className="h-3 w-3" />; })()}
                {MOODS[entry.mood].label}
              </span>
            )}
          </div>
          <h2 className="mt-2.5 font-display text-[22px] font-semibold tracking-[-0.02em]">{entry.title}</h2>
          <div className="mt-4 space-y-3.5">
            {entry.content.split(/\n+/).filter(Boolean).map((p, i) => (
              <p key={i} className="text-[14px] leading-[1.75] text-ink/85">{p}</p>
            ))}
          </div>
          {entry.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {entry.tags.map((t) => <Badge key={t}>#{t}</Badge>)}
            </div>
          )}
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <DeleteButton entry={entry} onDelete={onDelete} />
            <div className="flex gap-2">
              <PinButton entry={entry} />
              <Button variant="outline" onClick={() => setEditMode(true)}><PenLine className="h-4 w-4" /> Edit</Button>
            </div>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function PinButton({ entry }: { entry: JournalEntry }) {
  const updateEntry = useUpdateEntry();
  return (
    <Button variant="ghost" onClick={() => updateEntry.mutate({ id: entry.id, pinned: !entry.pinned })}>
      {entry.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
    </Button>
  );
}

function DeleteButton({ entry, onDelete }: { entry: JournalEntry; onDelete: () => void }) {
  void entry;
  return (
    <Button variant="ghost" className="text-down hover:bg-down-soft" onClick={onDelete}>
      <Trash2 className="h-4 w-4" /> Delete
    </Button>
  );
}

function EntryEditor({ entry, onClose }: { entry: JournalEntry | null; onClose: () => void }) {
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const [title, setTitle] = useState(entry?.title ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [date, setDate] = useState(entry?.date ?? new Date().toISOString().slice(0, 10));
  const [mood, setMood] = useState<string | null>(entry?.mood ?? null);
  const [tags, setTags] = useState((entry?.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const pending = createEntry.isPending || updateEntry.isPending;

  const submit = async () => {
    if (!title.trim()) return setError("Give the day a headline — even a small one.");
    const payload = {
      title: title.trim(),
      content,
      date,
      mood,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    try {
      if (entry) {
        await updateEntry.mutateAsync({ id: entry.id, ...payload });
      } else {
        await createEntry.mutateAsync(payload);
      }
      onClose();
    } catch {
      /* hook toasts */
    }
  };

  return (
    <div className="grid gap-4">
      <Input
        placeholder="Give today a headline…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-12 font-display text-[17px] font-semibold"
        autoFocus={!entry}
      />
      <Textarea
        rows={9}
        placeholder={"What happened in the market — and in your head — today?\n\nThe trades. The mood. The walk you took after the stop-out. All of it counts."}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="text-[14px] leading-[1.7]"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Tags" hint="comma separated">
          <Input placeholder="trading, health, family" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
      </div>
      <Field label="How the day felt">
        <div className="flex gap-1.5">
          {Object.entries(MOODS).map(([k, m]) => (
            <button
              key={k}
              type="button"
              onClick={() => setMood(mood === k ? null : k)}
              className={cn(
                "flex h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border transition-all cursor-pointer active:scale-95",
                mood === k ? "border-linestrong bg-line/60" : "border-line hover:bg-line/40"
              )}
            >
              <m.icon className={cn("h-[17px] w-[17px]", mood === k ? m.color : "text-faint")} />
              <span className={cn("text-[9.5px] font-medium", mood === k ? "text-ink" : "text-faint")}>{m.label}</span>
            </button>
          ))}
        </div>
      </Field>
      {error && <p className="text-[12.5px] text-down">{error}</p>}
      <div className="flex justify-end gap-2.5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={pending}>
          <Feather className="h-4 w-4" /> {entry ? "Save changes" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>}>
      <JournalInner />
    </Suspense>
  );
}
