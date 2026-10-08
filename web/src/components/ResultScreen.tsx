"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { ERROR_LABEL } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Attempt, Question, Rubric, StepResult } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { ScoreStamp } from "./ScoreStamp";
import { Loading } from "./states";

type Data = { attempt: Attempt; rubric: Rubric; question: Question };

export function ResultScreen() {
  const { id: attemptId } = useParams<{ id: string }>();
  const [active, setActive] = useState<string | null>(null);
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

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Your result" back={{ href: "/attempts", label: "My attempts" }} />

      {attempt.confidence === "low" && (
        <div role="status" className="mb-5 rounded-xl border border-warn/30 bg-warn-bg p-4 text-warn">
          <p className="font-semibold">Low confidence — a teacher will check this</p>
          <p className="mt-1 text-sm">{attempt.confidenceReason ?? "The grader was not sure about this answer."}</p>
        </div>
      )}

      <section className="mb-6 flex flex-col items-center gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center">
        <ScoreStamp total={attempt.total} max={attempt.max} />
        <div className="min-w-0 text-center sm:text-left">
          <p className="text-sm text-muted">{question.topic}</p>
          <p className="mt-1"><MathText text={question.text} /></p>
          <p className="mt-3 text-sm">
            {lost.length === 0
              ? "Full marks. Nothing to fix."
              : `${lost.length} step${lost.length > 1 ? "s" : ""} lost marks — see the fixes below.`}
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <section aria-labelledby="ans" className="md:sticky md:top-32 md:self-start">
          <h2 id="ans" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Your answer</h2>
          <ol className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
            {attempt.lines.map((l) => (
              <li
                key={l.n}
                className={`flex gap-3 rounded-md px-2 py-1.5 transition-colors ${highlighted.has(l.n) ? "bg-hl" : ""}`}
              >
                <span className="w-5 shrink-0 text-right text-sm text-muted">{l.n}</span>
                <span className="min-w-0 overflow-x-auto"><MathText text={l.text} /></span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="steps">
          <h2 id="steps" className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Step by step</h2>
          <ul className="space-y-3">
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
          <p className="mt-4 text-sm text-muted">
            Total {attempt.total} / {attempt.max}. <Link href="/answer" className="font-medium text-accent underline">Try another question</Link>
          </p>
        </section>
      </div>
    </div>
  );
}

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
        className={`w-full rounded-2xl border bg-surface p-4 text-left shadow-sm transition-colors ${
          active ? "border-navy/40" : "border-line"
        } ${full ? "" : "border-l-4 border-l-pen"}`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="font-medium">{title}</span>
          <span className={`shrink-0 text-lg font-bold ${full ? "text-ok" : "text-pen"}`}>
            {r.awarded} / {r.max}
          </span>
        </span>
        <span className="mt-1 block text-sm">{r.reason}</span>
        {!full && (
          <span className="mt-3 block space-y-2">
            {r.errorType && (
              <span className="inline-block rounded-full bg-pen/10 px-2.5 py-0.5 text-xs font-semibold text-pen">
                {ERROR_LABEL[r.errorType]}
              </span>
            )}
            {r.fix && (
              <span className="block rounded-lg bg-paper p-2.5 text-sm">
                <span className="font-semibold">Fix: </span>
                {r.fix}
              </span>
            )}
          </span>
        )}
        {r.matchedLines.length > 0 && (
          <span className="mt-2 block text-xs text-muted">
            Evidence: line{r.matchedLines.length > 1 ? "s" : ""} {r.matchedLines.join(", ")}
          </span>
        )}
      </button>
    </li>
  );
}
