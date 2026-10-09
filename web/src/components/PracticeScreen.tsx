"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { ERROR_LABEL, msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { PracticeAnswer, PracticeSet } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { CheckIcon, CrossIcon } from "./Icons";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { Loading, btnPrimary } from "./states";

// F. Three practice questions aimed at the error type, with instant feedback and progress.
export function PracticeScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, error, retry } = useLoad<PracticeSet>(id, () => api.startPractice(id));

  if (error) return <ErrorNotice title="Could not start practice" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Choosing your questions…" />;
  return <Session set={data} doubtId={id} />;
}

function Session({ set, doubtId }: { set: PracticeSet; doubtId: string }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answer, setAnswer] = useState<PracticeAnswer | null>(null);
  const [right, setRight] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = set.questions.length;
  const finished = index >= total;
  const question = set.questions[index];

  async function submit() {
    if (choice === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.answerPractice(set.id, question.id, choice);
      setAnswer(res);
      if (res.correct) setRight((n) => n + 1);
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  function next() {
    setIndex(index + 1);
    setChoice(null);
    setAnswer(null);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Practice" back={{ href: `/doubts/${encodeURIComponent(doubtId)}`, label: "How this was routed" }} />
      <p className="max-w-[58ch] text-muted">
        {set.topic}, aimed at: {ERROR_LABEL[set.errorType].toLowerCase()}. {set.reason}
      </p>

      <div className="mt-5" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(index + (answer ? 1 : 0), total)} aria-label="Practice progress">
        <div className="h-2 rounded-sm bg-line">
          <div
            className="h-2 rounded-sm bg-ai transition-[width] duration-300"
            style={{ width: `${(Math.min(index + (answer ? 1 : 0), total) / total) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-muted tnum">
          {finished ? `All ${total} done` : `Question ${index + 1} of ${total}`}
        </p>
      </div>

      {finished ? (
        <section className="mt-8 border-y border-line py-6" aria-live="polite">
          <h2 className="text-3xl">
            {right} of {total} right.
          </h2>
          <p className="mt-2 max-w-[56ch] text-lg">
            {right === total
              ? "Clean sweep. Keep the habit on your next marked answer."
              : "Go back to the explanation, then try again. The slips you fix here are marks you keep in the exam."}
          </p>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/examiner" className={`${btnPrimary} inline-block min-h-12`}>
              Snap another answer
            </Link>
            <Link href="/" className="self-center font-medium text-ai underline">
              Back home
            </Link>
          </div>
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="pq">
          <fieldset disabled={busy || answer !== null}>
            <legend id="pq" className="max-w-[56ch] font-heading text-2xl">
              <MathText text={question.text} />
            </legend>
            <div className="mt-4 space-y-2">
              {question.options.map((o, i) => (
                <label
                  key={o}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-4 ${
                    choice === i ? "border-navy bg-hl/60" : "border-line bg-surface"
                  }`}
                >
                  <input type="radio" name="opt" checked={choice === i} onChange={() => setChoice(i)} />
                  <MathText text={o} />
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <div className="mt-3">
              <ErrorNotice title="Could not check that answer" message={error} />
            </div>
          )}

          {answer ? (
            <div className="mt-5">
              <p
                role="status"
                className={`flex items-start gap-2 rounded-md p-3 ${answer.correct ? "bg-ok-bg text-ok" : "bg-hl text-pen"}`}
              >
                {answer.correct ? <CheckIcon className="mt-0.5 size-5 shrink-0" /> : <CrossIcon className="mt-0.5 size-5 shrink-0" />}
                <span>
                  <span className="font-semibold">{answer.correct ? "Correct. " : "Not quite. "}</span>
                  <MathText text={answer.feedback} />
                </span>
              </p>
              <button type="button" onClick={next} className={`${btnPrimary} mt-4 min-h-12`}>
                {index + 1 < total ? "Next question" : "See my result"}
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void submit()} disabled={choice === null || busy} className={`${btnPrimary} mt-5 min-h-12`}>
              {busy ? "Checking…" : "Check"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
