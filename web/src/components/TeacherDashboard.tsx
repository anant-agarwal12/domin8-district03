"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Attempt, Doubt, QueueItem, Resolution, Session, TeacherQueue } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { DnaBars } from "./DnaBars";
import { ErrorBadge } from "./ErrorBadge";
import { ErrorNotice } from "./ErrorNotice";
import { VideoIcon } from "./Icons";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { EmptyState, Loading, btnGhost, btnPrimary, inputCls } from "./states";
import { WhyTrace } from "./WhyTrace";

const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

// G. Teacher dashboard: a live queue, a diagnosis card per doubt, a session, and a resolution that feeds the knowledge base.
export function TeacherDashboard() {
  const { profile } = useAuth();
  const [queue, setQueue] = useState<TeacherQueue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [announce, setAnnounce] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [resolved, setResolved] = useState<Record<string, Resolution>>({});
  const [attempt, setAttempt] = useState(0);
  const known = useRef<Set<string>>(new Set());

  useEffect(() => {
    known.current = new Set();
    return api.watchTeacherQueue(
      (q) => {
        const arrivals = q.items.filter((i) => !known.current.has(i.doubt.id));
        if (known.current.size > 0 && arrivals.length > 0) {
          setFresh((f) => new Set([...f, ...arrivals.map((a) => a.doubt.id)]));
          setAnnounce(`New doubt from ${arrivals[0].doubt.studentName}: ${arrivals[0].doubt.topic}`);
        }
        arrivals.forEach((a) => known.current.add(a.doubt.id));
        setQueue(q);
        setError(null);
      },
      (e) => setError(msg(e)),
    );
  }, [attempt]);

  if (profile?.role === "student") {
    return <EmptyState title="This page is for teachers">Your doubts and their routes are on your home page.</EmptyState>;
  }
  if (error) return <ErrorNotice title="Could not load the queue" message={error} onRetry={() => setAttempt((n) => n + 1)} />;
  if (!queue) return <Loading label="Loading the queue…" />;

  const waiting = [...queue.items]
    .filter((i) => !resolved[i.doubt.id])
    .sort(
      (a, b) =>
        Number(b.doubt.priority === "high") - Number(a.doubt.priority === "high") ||
        Number(fresh.has(b.doubt.id)) - Number(fresh.has(a.doubt.id)) ||
        b.doubt.createdAt.localeCompare(a.doubt.createdAt),
    );
  const active = waiting.find((i) => i.doubt.id === selected) ?? waiting[0] ?? null;
  const group = queue.groupSuggestions.find((g) => g.studentCount >= 3 && g.doubtIds.some((id) => !resolved[id]));
  const done = Object.keys(resolved).length;

  async function start(doubtId: string, kind: "live" | "one_to_one") {
    const s = await api.acceptDoubt(doubtId, kind);
    setSessions((m) => ({ ...m, [doubtId]: s }));
    setSelected(doubtId);
  }

  return (
    <div>
      <PageHeader title="Doubt queue" />
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {group && (
        <section aria-label="Group session suggestion" className="mb-6 rounded-md border border-ai/40 bg-ai-bg p-4">
          <p className="font-medium">{group.reason}</p>
          <GroupStart onStart={() => start(group.doubtIds[0], "live")} count={group.studentCount} started={Boolean(sessions[group.doubtIds[0]])} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <section aria-labelledby="q-h">
          <h2 id="q-h" className="text-xl">
            Waiting for you <span className="text-muted tnum">({waiting.length})</span>
          </h2>
          {waiting.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="The queue is clear">New doubts appear here as students send them.</EmptyState>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {waiting.map((i) => (
                <QueueRow
                  key={i.doubt.id}
                  item={i}
                  isNew={fresh.has(i.doubt.id)}
                  selected={active?.doubt.id === i.doubt.id}
                  inSession={Boolean(sessions[i.doubt.id])}
                  onSelect={() => {
                    setSelected(i.doubt.id);
                    setFresh((f) => {
                      const n = new Set(f);
                      n.delete(i.doubt.id);
                      return n;
                    });
                  }}
                />
              ))}
            </ul>
          )}
          {done > 0 && <p className="mt-3 text-sm text-muted">{done} resolved this session.</p>}
        </section>

        {active && (
          <Diagnosis
            key={active.doubt.id}
            item={active}
            session={sessions[active.doubt.id]}
            onStart={(kind) => start(active.doubt.id, kind)}
            onResolved={(r) => setResolved((m) => ({ ...m, [active.doubt.id]: r }))}
          />
        )}
      </div>
    </div>
  );
}

function GroupStart({ onStart, count, started }: { onStart: () => Promise<void>; count: number; started: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || started}
      onClick={async () => {
        setBusy(true);
        try {
          await onStart();
        } finally {
          setBusy(false);
        }
      }}
      className={`${btnPrimary} mt-3 min-h-11`}
    >
      {started ? "Group session started" : busy ? "Starting…" : `Start one group session for ${count} students`}
    </button>
  );
}

function QueueRow({
  item,
  isNew,
  selected,
  inSession,
  onSelect,
}: {
  item: QueueItem;
  isNew: boolean;
  selected: boolean;
  inSession: boolean;
  onSelect: () => void;
}) {
  const d = item.doubt;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={`flex min-h-20 w-full flex-col items-start gap-1 border-l-4 px-3 py-3 text-left ${
          selected ? "border-accent bg-hl/50" : "border-transparent hover:bg-hl/30"
        }`}
      >
        <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-heading text-lg font-semibold">{d.studentName}</span>
          {isNew && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-accent-ink">New</span>}
          {d.priority === "high" && <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-semibold text-paper">Urgent</span>}
          {inSession && <span className="rounded-full border border-ai px-2 py-0.5 text-xs font-semibold text-ai">In session</span>}
          <span className="ml-auto text-xs text-muted tnum">{clock(d.createdAt)}</span>
        </span>
        <span className="text-sm text-muted">{d.topic}</span>
        <span className="line-clamp-2 text-sm">{d.routeReason}</span>
      </button>
    </li>
  );
}

// The diagnosis card: what the student wrote, why it reached a teacher, their pattern, then the session and resolution.
function Diagnosis({
  item,
  session,
  onStart,
  onResolved,
}: {
  item: QueueItem;
  session: Session | undefined;
  onStart: (kind: "live" | "one_to_one") => Promise<void>;
  onResolved: (r: Resolution) => void;
}) {
  const d: Doubt = item.doubt;
  const [busy, setBusy] = useState<"live" | "one_to_one" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function begin(kind: "live" | "one_to_one") {
    setBusy(kind);
    setError(null);
    try {
      await onStart(kind);
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <article aria-labelledby="dx-h" className="rounded-md border border-line bg-surface p-5 lg:sticky lg:top-36 lg:self-start">
      <header>
        <h2 id="dx-h" className="text-2xl">
          {d.studentName}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
          {d.topic}
          {d.errorType && <ErrorBadge type={d.errorType} />}
        </p>
      </header>

      <blockquote className="mt-4 border-l-4 border-accent-light pl-4 font-heading text-lg italic">{d.text}</blockquote>

      <section className="mt-5" aria-labelledby="why-h">
        <h3 id="why-h" className="text-lg">
          Why this reached you
        </h3>
        <p className="mt-1">{d.routeReason}</p>
        <WhyTrace doubt={d} />
      </section>

      <section className="mt-5" aria-labelledby="diag-h">
        <h3 id="diag-h" className="text-lg">
          Diagnosis
        </h3>
        <p className="mt-1">{item.diagnosis.summary}</p>
      </section>

      {item.diagnosis.attemptId && <MarkedAnswer attemptId={item.diagnosis.attemptId} />}

      <section className="mt-5" aria-labelledby="dna-h">
        <h3 id="dna-h" className="text-lg">
          Mistake pattern
        </h3>
        <div className="mt-2">
          <DnaBars entries={item.diagnosis.mistakeDna} limit={3} />
        </div>
      </section>

      <div className="mt-6 border-t border-line pt-5">
        {session ? (
          <SessionPanel session={session} onResolved={onResolved} />
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void begin("live")} disabled={busy !== null} className={`${btnPrimary} min-h-12`}>
                {busy === "live" ? "Starting…" : "Start session"}
              </button>
              <button type="button" onClick={() => void begin("one_to_one")} disabled={busy !== null} className={`${btnGhost} min-h-12`}>
                {busy === "one_to_one" ? "Setting up…" : "One-to-one instead"}
              </button>
            </div>
            {error && (
              <div className="mt-3">
                <ErrorNotice title="Could not start the session" message={error} />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  );
}

function MarkedAnswer({ attemptId }: { attemptId: string }) {
  const { data, error } = useLoad<Attempt>(attemptId, () => api.getAttempt(attemptId));
  return (
    <section className="mt-5" aria-labelledby="ma-h">
      <h3 id="ma-h" className="text-lg">
        Their marked answer
      </h3>
      {error ? (
        <p className="mt-1 text-sm text-muted">The marked answer is not available.</p>
      ) : !data ? (
        <p className="mt-1 text-sm text-muted" aria-busy="true">
          Loading…
        </p>
      ) : (
        <div className="mt-2 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
          <ol className="ruled rounded-md border border-line bg-paper px-3">
            {data.lines.map((l) => (
              <li key={l.n} className={`flex min-h-9 items-center gap-2 ${l.legible === false ? "bg-hl" : ""}`}>
                <span className="w-4 text-right text-xs text-muted tnum">{l.n}</span>
                <span className="font-hand text-xl">
                  <MathText text={l.text} />
                </span>
              </li>
            ))}
          </ol>
          <ul className="space-y-1 text-sm">
            {data.stepResults.map((r) => (
              <li key={r.stepId} className="flex justify-between gap-3">
                <span className="text-muted">{r.stepId}</span>
                <span className={`hand text-xl tnum ${r.awarded >= r.max ? "text-ok" : "text-pen"}`}>
                  {r.awarded}/{r.max}
                </span>
              </li>
            ))}
            <li className="flex justify-between gap-3 border-t border-line pt-1 font-medium">
              <span>Total</span>
              <span className="hand text-2xl text-pen tnum">
                {data.total}/{data.max}
              </span>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

// The session opens the video room in a new tab. Resolving it writes the fix into the knowledge base.
function SessionPanel({ session, onResolved }: { session: Session; onResolved: (r: Resolution) => void }) {
  const [summary, setSummary] = useState("");
  const [correction, setCorrection] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Resolution | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.resolveSession(session.id, summary.trim(), correction.trim());
      setDone(r);
      setTimeout(() => onResolved(r), 2200);
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="sess-h">
      <h3 id="sess-h" className="text-lg">
        {session.kind === "live" ? "Live session" : "One-to-one session"} with {session.teacherName}
      </h3>
      <a
        href={session.roomUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnPrimary} mt-3 inline-flex min-h-12 items-center gap-2`}
      >
        <VideoIcon /> Open the video room
      </a>
      <p className="mt-1 text-xs text-muted">Opens in a new tab.</p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="sum" className="mb-1 block text-sm font-medium">
            What was going wrong
          </label>
          <textarea id="sum" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} disabled={busy} />
        </div>
        <div>
          <label htmlFor="cor" className="mb-1 block text-sm font-medium">
            The fix you taught
          </label>
          <textarea id="cor" rows={3} value={correction} onChange={(e) => setCorrection(e.target.value)} className={inputCls} disabled={busy} />
          <p className="mt-1 text-xs text-muted">Later doubts like this one will cite your fix.</p>
        </div>
      </div>

      {error && (
        <div className="mt-3">
          <ErrorNotice title="Could not save the resolution" message={error} />
        </div>
      )}
      {done ? (
        <p role="status" className="mt-4 rounded-md bg-ok-bg p-3 font-medium text-ok">
          {done.message}
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || summary.trim().length < 3 || correction.trim().length < 3}
          className={`${btnPrimary} mt-4 min-h-12`}
        >
          {busy ? "Saving…" : "Resolve and add to knowledge base"}
        </button>
      )}
    </section>
  );
}
