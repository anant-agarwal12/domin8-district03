"use client";

import { useId, useState } from "react";
import { AGENT_LABEL, ROUTE_LABEL } from "@/lib/labels";
import type { Doubt } from "@/lib/types";

const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

// "Why?": opens the full decision trace behind a one-line reason. The agents' steps in order, then the policy rules.
export function WhyTrace({ doubt, defaultOpen = false }: { doubt: Doubt; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="min-h-11 text-sm font-medium text-ai underline"
      >
        {open ? "Hide the trace" : "Why?"}
      </button>
      {open && (
        <div id={id} className="mt-2 space-y-8">
          <Timeline doubt={doubt} />
          <Rules doubt={doubt} />
        </div>
      )}
    </div>
  );
}

function Timeline({ doubt }: { doubt: Doubt }) {
  if (doubt.agentLog.length === 0) return <p className="text-sm text-muted">No agent steps were recorded for this doubt.</p>;
  return (
    <section aria-labelledby="steps-h">
      <h3 id="steps-h" className="text-lg">
        What happened, in order
      </h3>
      <ol className="mt-3 border-l-2 border-line pl-5">
        {doubt.agentLog.map((s, i) => {
          const decisive = s.agent === "policy" || s.agent === "orchestrator";
          return (
            <li key={i} className="relative pb-5 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-[1.62rem] top-1.5 size-3 rounded-full border-2 ${
                  decisive ? "border-accent bg-accent" : "border-ai bg-surface"
                }`}
              />
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className={`font-medium ${decisive ? "text-accent" : "text-ai"}`}>{AGENT_LABEL[s.agent]}</span>
                <span className="text-xs text-muted tnum">{time(s.at)}</span>
              </p>
              <p className="text-sm">{s.summary}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Rules({ doubt }: { doubt: Doubt }) {
  if (doubt.firedRules.length === 0) return null;
  return (
    <section aria-labelledby="rules-h">
      <h3 id="rules-h" className="text-lg">
        Rules that fired
      </h3>
      <p className="mt-1 text-sm text-muted">The first matching rule decides. The others are shown so nothing is hidden.</p>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {doubt.firedRules.map((r) => (
          <li key={r.rule} className="py-3">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">
                Rule {r.rule}: {r.condition}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  r.decisive ? "bg-navy text-paper" : "border border-line text-muted"
                }`}
              >
                {r.decisive ? "Decided" : "Also fired, not used"}
              </span>
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Would send you to: {ROUTE_LABEL[r.route].toLowerCase()}. {r.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
