"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { msg } from "@/lib/labels";
import { ErrorNotice } from "./ErrorNotice";
import { PageHeader } from "./Page";
import { btnPrimary, inputCls } from "./states";

// Prefilled doubts for the demo story (?example=...).
const EXAMPLES: Record<string, string> = {
  work: "I lost marks on a work-done question because I left out the formula line. Does the formula really matter?",
};

// Type a doubt in your own words. The orchestrator decides where it goes.
export function AskScreen() {
  const router = useRouter();
  const example = useSearchParams().get("example");
  const [text, setText] = useState(example ? (EXAMPLES[example] ?? "") : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const doubt = await api.createDoubt({ source: "manual", text: text.trim() });
      router.push(`/doubts/${encodeURIComponent(doubt.id)}`);
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Ask a doubt" back={{ href: "/", label: "Home" }} />
      <label htmlFor="doubt" className="mb-1 block font-medium">
        What are you stuck on?
      </label>
      <textarea
        id="doubt"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Say it the way you would say it to a friend."
        className={inputCls}
      />
      <p className="mt-1 text-sm text-muted">
        We will decide whether an explanation, practice or a teacher is the quickest way out, and tell you why.
      </p>
      {error && (
        <div className="mt-4">
          <ErrorNotice title="Could not send your doubt" message={error} />
        </div>
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || text.trim().length < 5}
        className={`${btnPrimary} mt-5 min-h-12`}
      >
        {busy ? "Finding the right help…" : "Find the right help"}
      </button>
    </div>
  );
}
