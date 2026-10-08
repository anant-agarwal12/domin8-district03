"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Question, Rubric } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { EmptyState, Loading, btnGhost, btnPrimary, inputCls } from "./states";

type Ready = { question: Question; rubric: Rubric };

const MATH_HINT = String.raw`Put maths between dollar signs, like $E = \frac{1}{2}mv^2$. A preview shows under each line.`;

export function AnswerScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [lines, setLines] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const course = profile?.course ?? "";
  const loaded = useLoad<Ready[]>(course, async () => {
    const { items } = await api.listQuestions(course);
    const withRubric = items.filter((q) => q.rubricId);
    const rubrics = await Promise.all(withRubric.map((q) => api.getRubric(q.rubricId!)));
    return withRubric
      .map((question, i) => ({ question, rubric: rubrics[i] }))
      .filter((x) => x.rubric.status === "confirmed");
  });
  const ready = loaded.data;

  if (loaded.error) return <ErrorNotice title="Could not load questions" message={loaded.error} onRetry={loaded.retry} />;
  if (!ready) return <Loading label="Loading questions…" />;
  if (ready.length === 0) {
    return (
      <EmptyState title="No question is ready to answer">
        A question needs a confirmed rubric first.{" "}
        <Link href="/questions/new" className="font-medium text-accent underline">Create one</Link>.
      </EmptyState>
    );
  }

  const current = ready.find((r) => r.question.id === selected) ?? ready[0];
  const filled = lines.map((l) => l.trim()).filter(Boolean);
  const setLine = (i: number, v: string) => setLines(lines.map((l, j) => (j === i ? v : l)));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // Blank rows are dropped and the rest renumbered so line numbers stay contiguous.
      const attempt = await api.gradeAttempt({
        questionId: current.question.id,
        rubricId: current.rubric.id,
        inputType: "typed",
        lines: filled.map((text, i) => ({ n: i + 1, text })),
      });
      router.push(`/attempts/${encodeURIComponent(attempt.id)}`);
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Answer a question" />
      <div className="space-y-5">
        <div>
          <label htmlFor="q" className="mb-1 block text-sm font-medium">Question</label>
          <select id="q" value={current.question.id} onChange={(e) => setSelected(e.target.value)} className={inputCls}>
            {ready.map(({ question }) => (
              <option key={question.id} value={question.id}>
                {question.topic} · {question.marks} marks · {question.text.slice(0, 50)}
              </option>
            ))}
          </select>
          <p className="mt-3 rounded-xl border border-line bg-surface p-4">
            <MathText text={current.question.text} />
            <span className="mt-2 block text-sm text-muted">[{current.question.marks} marks]</span>
          </p>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Your answer — one step per line</p>
          <p className="mb-2 text-xs text-muted">{MATH_HINT}</p>
          <ol className="space-y-2">
            {lines.map((text, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-6 shrink-0 pt-2.5 text-right text-sm text-muted" aria-hidden>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={`Answer line ${i + 1}`}
                    value={text}
                    onChange={(e) => setLine(i, e.target.value)}
                    className={`${inputCls} font-mono text-sm`}
                  />
                  {text.includes("$") && (
                    <p className="mt-1 overflow-x-auto rounded-md bg-paper px-2 py-1"><MathText text={text} /></p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove line ${i + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                  className={`${btnGhost} self-start`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setLines([...lines, ""])} className={`${btnGhost} mt-2`}>+ Add line</button>
        </div>

        {error && <ErrorNotice title="Could not grade your answer" message={error} />}
        <button type="button" onClick={() => void submit()} disabled={busy || filled.length === 0} className={`${btnPrimary} w-full sm:w-auto`}>
          {busy ? "Grading… this can take a few seconds" : "Submit for grading"}
        </button>
      </div>
    </div>
  );
}
