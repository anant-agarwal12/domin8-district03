"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Attempt, Question, Rubric, StepResult } from "@/lib/types";
import { ErrorBadge } from "./ErrorBadge";
import { ErrorNotice } from "./ErrorNotice";
import { AlertIcon, EyeIcon } from "./Icons";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { ScoreStamp } from "./ScoreStamp";
import { Loading, btnPrimary } from "./states";

type Data = { attempt: Attempt; rubric: Rubric; question: Question };

export function ResultScreen() {
  const { id: attemptId } = useParams<{ id: string }>();
  const router = useRouter();
  const [active, setActive] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const { data, error, retry } = useLoad<Data>(attemptId, async () => {
    const attempt = await api.getAttempt(attemptId);
    const [rubric, question] = await Promise.all([
      api.getRubric(attempt.rubricId),
      api.getQuestion(attempt.questionId),
    ]);
    return { attempt, rubric, question };
  });

  if (error) return <ErrorNotice title="Could not load this result" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Loading result…" />;

  const { attempt, rubric, question } = data;
  const descriptions = new Map(rubric.steps.map((s) => [s.id, s.description]));
  const activeResult = attempt.stepResults.find((r) => r.stepId === active);
  const highlighted = new Set(activeResult?.matchedLines ?? []);
  const lost = attempt.stepResults.filter((r) => r.awarded < r.max);
  const low = attempt.confidence === "low";
  const handwritten = attempt.inputType === "photo";

  async function askTeacher() {
    setAsking(true);
    setAskError(null);
    try {
      const doubt = await api.createDoubt({
        source: "evaluation",
        attemptId: attempt.id,
        text: `Please check how my ${question.topic} answer was marked.`,
      });
      router.push(`/doubts/${encodeURIComponent(doubt.id)}`);
    } catch (e) {
      setAskError(msg(e));
      setAsking(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Your marked answer" back={{ href: "/attempts", label: "My attempts" }} />

      {low && (
        <div role="status" className="mb-6 flex gap-3 rounded-md border border-warn/40 bg-warn-bg p-4 text-warn">
          <AlertIcon className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Low confidence. A teacher should check this.</p>
            <p className="mt-1 text-sm">{attempt.confidenceReason ?? "The grader was not sure about this answer."}</p>
          </div>
        </div>
      )}

      <section className="mb-8 flex flex-col items-center gap-6 border-y border-line py-6 sm:flex-row">
        <ScoreStamp total={attempt.total} max={attempt.max} />
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-sm text-muted">{question.topic}</p>
          <p className="mt-1 max-w-[52ch] text-lg">
            <MathText text={question.text} />
          </p>
          <p className="mt-3 text-muted">
            {lost.length === 0
              ? "Full marks. Nothing to fix."
              : `${lost.length} of ${attempt.stepResults.length} steps lost marks. The fixes are below.`}
          </p>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-[2fr_3fr]">
        <section aria-labelledby="ans" className="md:sticky md:top-36 md:self-start">
          <h2 id="ans" className="mb-2 text-xl">
            Your answer
          </h2>
          <ol className="ruled rounded-md border border-line bg-surface px-3 py-1">
            {attempt.lines.map((l) => (
              <li
                key={l.n}
                className={`flex min-h-9 items-center gap-3 rounded-sm px-1 transition-colors ${highlighted.has(l.n) ? "bg-hl" : ""}`}
              >
                <span className="w-5 shrink-0 text-right text-sm text-muted tnum">{l.n}</span>
                <span className={`min-w-0 overflow-x-auto ${handwritten ? "font-hand text-2xl" : ""}`}>
                  <MathText text={l.text} />
                </span>
                {l.legible === false && (
                  <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm text-warn">
                    <EyeIcon className="size-4" /> Hard to read
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="steps">
          <h2 id="steps" className="mb-2 text-xl">
            Step by step
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {attempt.stepResults.map((r) => (
              <StepRow
                key={r.stepId}
                result={r}
                title={descriptions.get(r.stepId) ?? r.stepId}
                active={active === r.stepId}
                onActivate={() => setActive(r.stepId)}
                onToggle={() => setActive(active === r.stepId ? null : r.stepId)}
                onLeave={() => setActive(null)}
              />
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => void askTeacher()} disabled={asking} className={btnPrimary}>
              {asking ? "Sending…" : "Ask a teacher to review"}
            </button>
            <Link href="/answer" className="font-medium text-ai underline">
              Try another question
            </Link>
          </div>
          {askError && (
            <div className="mt-4">
              <ErrorNotice title="Could not send this to a teacher" message={askError} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// One rubric step, marked in the margin like a script: the mark in pen, the reason in plain words, the fix as a note.
function StepRow({
  result: r,
  title,
  active,
  onActivate,
  onToggle,
  onLeave,
}: {
  result: StepResult;
  title: string;
  active: boolean;
  onActivate: () => void;
  onToggle: () => void;
  onLeave: () => void;
}) {
  const full = r.awarded >= r.max;
  return (
    <li>
      <button
        type="button"
        aria-pressed={active}
        onMouseEnter={onActivate}
        onMouseLeave={onLeave}
        onClick={onToggle}
        className={`grid w-full grid-cols-[4.5rem_1fr] items-start gap-3 py-4 text-left transition-colors ${active ? "bg-hl/50" : "hover:bg-hl/30"}`}
      >
        <span className={`hand text-4xl tnum ${full ? "text-ok" : "text-pen"}`}>
          {r.awarded}/{r.max}
        </span>
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="mt-0.5 block text-sm text-muted">
            <MathText text={r.reason} />
          </span>
          {!full && (
            <span className="mt-2 flex flex-wrap items-center gap-2">
              {r.errorType && <ErrorBadge type={r.errorType} />}
            </span>
          )}
          {!full && r.fix && (
            <span className="hand mt-2 block text-xl text-pen">
              <MathText text={r.fix} />
            </span>
          )}
          {r.matchedLines.length > 0 && (
            <span className="mt-1 block text-xs text-muted">
              Evidence: line{r.matchedLines.length > 1 ? "s" : ""} {r.matchedLines.join(", ")}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
