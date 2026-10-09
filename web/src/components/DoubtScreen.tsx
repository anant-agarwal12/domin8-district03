"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { ROUTE_LABEL, ROUTE_SENTENCE, msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Doubt, Route } from "@/lib/types";
import { ErrorBadge } from "./ErrorBadge";
import { ErrorNotice } from "./ErrorNotice";
import { PageHeader } from "./Page";
import { Loading, btnGhost, btnPrimary, inputCls } from "./states";
import { WhyTrace } from "./WhyTrace";

// D. Route decision: where the doubt goes, in one plain line, with the full trace one click away.
export function DoubtScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, error, retry } = useLoad<Doubt>(id, () => api.getDoubt(id));
  const [changed, setChanged] = useState<Doubt | null>(null);

  if (error) return <ErrorNotice title="Could not load this doubt" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Finding the right help…" />;
  const doubt = changed ?? data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Where your doubt goes" back={{ href: "/", label: "Home" }} />

      <blockquote className="border-l-4 border-accent-light pl-4 font-heading text-xl italic">{doubt.text}</blockquote>
      <p className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
        {doubt.topic}
        {doubt.errorType && <ErrorBadge type={doubt.errorType} />}
      </p>

      <section aria-labelledby="route" className="mt-8 border-y border-line py-6">
        <p className="text-sm text-muted">Sent to: {ROUTE_LABEL[doubt.route].toLowerCase()}</p>
        <h2 id="route" className="mt-1 text-3xl">
          {ROUTE_SENTENCE[doubt.route]}
        </h2>
        <p className="mt-2 max-w-[58ch] text-lg">{doubt.routeReason}</p>
        {doubt.overriddenFrom && doubt.overrideReason && (
          <p className="mt-3 rounded-md bg-ai-bg px-3 py-2 text-sm">
            You changed this from {ROUTE_LABEL[doubt.overriddenFrom].toLowerCase()} to {ROUTE_LABEL[doubt.route].toLowerCase()}:
            &ldquo;{doubt.overrideReason}&rdquo;
          </p>
        )}
        <div className="mt-5">
          <NextStep doubt={doubt} />
        </div>
      </section>

      <div className="mt-4">
        <WhyTrace doubt={doubt} defaultOpen />
      </div>

      <Override doubt={doubt} onChanged={setChanged} />
    </div>
  );
}

function NextStep({ doubt }: { doubt: Doubt }) {
  if (doubt.route === "explain") {
    return (
      <Link href={`/doubts/${encodeURIComponent(doubt.id)}/explain`} className={`${btnPrimary} inline-block min-h-12`}>
        Read the explanation
      </Link>
    );
  }
  if (doubt.route === "practice") {
    return (
      <Link href={`/doubts/${encodeURIComponent(doubt.id)}/practice`} className={`${btnPrimary} inline-block min-h-12`}>
        Start practice
      </Link>
    );
  }
  return (
    <p className="rounded-md bg-ai-bg px-4 py-3">
      <span className="font-medium">You are in the teacher queue.</span> Dr. Arjun Rao sees your marked answer, your
      mistake pattern and why you were sent here, so you will not need to explain it again.
    </p>
  );
}

const ROUTES: Route[] = ["explain", "practice", "teacher"];

// The student can overrule the route. The policy rules still log what they would have chosen.
function Override({ doubt, onChanged }: { doubt: Doubt; onChanged: (d: Doubt) => void }) {
  const [open, setOpen] = useState(false);
  const [route, setRoute] = useState<Route | "">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = ROUTES.filter((r) => r !== doubt.route);

  async function submit() {
    if (!route) return;
    setBusy(true);
    setError(null);
    try {
      onChanged(await api.overrideDoubt(doubt.id, route, reason.trim()));
      setOpen(false);
      setRoute("");
      setReason("");
    } catch (e) {
      setError(msg(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-8">
        <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} min-h-11`}>
          Choose a different route
        </button>
      </div>
    );
  }
  return (
    <section aria-labelledby="ov" className="mt-8 rounded-md border border-line bg-surface p-5">
      <h2 id="ov" className="text-xl">
        Choose a different route
      </h2>
      <fieldset className="mt-3">
        <legend className="mb-1 text-sm font-medium">Send my doubt to</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((r) => (
            <label
              key={r}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 ${
                route === r ? "border-navy bg-hl/60 font-medium" : "border-line bg-paper"
              }`}
            >
              <input type="radio" name="route" value={r} checked={route === r} onChange={() => setRoute(r)} />
              {ROUTE_LABEL[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4">
        <label htmlFor="why" className="mb-1 block text-sm font-medium">
          Why? (optional)
        </label>
        <textarea
          id="why"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className={inputCls}
        />
        <p className="mt-1 text-xs text-muted">Your reason is saved with the doubt.</p>
      </div>
      {error && (
        <div className="mt-3">
          <ErrorNotice title="Could not change the route" message={error} />
        </div>
      )}
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => void submit()} disabled={!route || busy} className={`${btnPrimary} min-h-11`}>
          {busy ? "Changing…" : "Change route"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${btnGhost} min-h-11`}>
          Cancel
        </button>
      </div>
    </section>
  );
}
