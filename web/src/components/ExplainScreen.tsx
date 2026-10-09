"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { CheckResult, Explanation } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { CheckIcon, CrossIcon } from "./Icons";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { Loading, btnGhost, btnPrimary } from "./states";

const longDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

// E. Explanation with page citations and one check question. H. When a teacher session matches, it is cited first.
export function ExplainScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, error, retry } = useLoad<Explanation>(id, async () => {
    const doubt = await api.getDoubt(id);
    return api.explain({ doubtId: doubt.id, text: doubt.text, topic: doubt.topic });
  });

  if (error) return <ErrorNotice title="Could not write the explanation" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Writing your explanation…" />;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Your explanation" back={{ href: `/doubts/${encodeURIComponent(id)}`, label: "How this was routed" }} />

      {data.kbCitations.map((k) => (
        <aside key={k.sessionId} className="mb-6 rounded-md border border-navy/30 bg-surface p-4" aria-label="Teacher session">
          <p className="font-semibold">
            Resolved by {k.teacherName}, session on {longDate(k.resolvedOn)}
          </p>
          <p className="hand mt-1 text-2xl text-pen">&ldquo;{k.summary}&rdquo;</p>
        </aside>
      ))}

      <article className="border-l-4 border-ai pl-5" aria-label="Explanation">
        <p className="text-sm font-medium text-ai">Written by Unstuck</p>
        <p className="mt-2 max-w-[62ch] text-lg leading-relaxed">
          <MathText text={data.answer} />
        </p>
        <p className="mt-3 text-sm text-muted">{data.reason}</p>
      </article>

      {data.citations.length > 0 && (
        <section aria-labelledby="src" className="mt-8">
          <h2 id="src" className="text-xl">
            Where this comes from
          </h2>
          <ul className="mt-3 space-y-3">
            {data.citations.map((c) => (
              <li key={`${c.docId}-${c.page}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Link
                  href={`/reader?doc=${encodeURIComponent(c.docId)}&page=${c.page}`}
                  className="inline-flex min-h-11 max-w-full items-center self-start rounded-full border border-ai/40 bg-ai-bg px-4 py-1 text-sm font-medium text-ai hover:border-ai"
                >
                  {c.docTitle}, page {c.page}
                </Link>
                <p className="min-w-0 text-sm italic text-muted">&ldquo;{c.snippet}&rdquo;</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.checkQuestion && <Check explanationId={data.id} question={data.checkQuestion} />}

      <div className="mt-10 flex flex-wrap gap-4 text-sm">
        <Link href={`/doubts/${encodeURIComponent(id)}/practice`} className="font-medium text-ai underline">
          Practise this topic
        </Link>
        <Link href="/ask" className="font-medium text-ai underline">
          Ask another doubt
        </Link>
      </div>
    </div>
  );
}

function Check({ explanationId, question }: { explanationId: string; question: NonNullable<Explanation["checkQuestion"]> }) {
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (choice === null) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await api.checkExplanation(explanationId, choice));
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="chk" className="mt-10 rounded-md border border-line bg-surface p-5">
      <h2 id="chk" className="text-xl">
        One question to check it stuck
      </h2>
      <fieldset className="mt-3" disabled={busy}>
        <legend className="max-w-[60ch]">
          <MathText text={question.text} />
        </legend>
        <div className="mt-3 space-y-2">
          {question.options.map((o, i) => (
            <label
              key={o}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-4 ${
                choice === i ? "border-navy bg-hl/60" : "border-line bg-paper"
              }`}
            >
              <input
                type="radio"
                name="check"
                checked={choice === i}
                onChange={() => {
                  setChoice(i);
                  setResult(null);
                }}
              />
              <MathText text={o} />
            </label>
          ))}
        </div>
      </fieldset>
      <button type="button" onClick={() => void submit()} disabled={choice === null || busy} className={`${btnPrimary} mt-4 min-h-11`}>
        {busy ? "Checking…" : "Check my answer"}
      </button>
      {error && (
        <div className="mt-3">
          <ErrorNotice title="Could not check your answer" message={error} />
        </div>
      )}
      {result && (
        <p
          role="status"
          className={`mt-4 flex items-start gap-2 rounded-md p-3 ${result.correct ? "bg-ok-bg text-ok" : "bg-hl text-pen"}`}
        >
          {result.correct ? <CheckIcon className="mt-0.5 size-5 shrink-0" /> : <CrossIcon className="mt-0.5 size-5 shrink-0" />}
          <span>
            <span className="font-semibold">{result.correct ? "Correct. " : "Not quite. "}</span>
            <MathText text={result.why} />
          </span>
        </p>
      )}
      {result && !result.correct && (
        <button type="button" onClick={() => setResult(null)} className={`${btnGhost} mt-3 min-h-11`}>
          Try again
        </button>
      )}
    </section>
  );
}
