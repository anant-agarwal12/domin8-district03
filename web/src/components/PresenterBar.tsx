"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { resetMockState } from "@/lib/api";
import { DEMO_MODE } from "@/lib/config";
import { DEMO_STEPS, demoFlags, setPersona } from "@/lib/demo";

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

// Slim presenter bar for pitches. Alt+P shows or hides it; Left and Right arrows move between demo steps.
export function PresenterBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (i: number) => {
      const next = Math.min(Math.max(i, 0), DEMO_STEPS.length - 1);
      const step = DEMO_STEPS[next];
      setIndex(next);
      setPersona(step.persona);
      if (step.seedKb) demoFlags.kbResolved = true;
      router.push(step.route);
    },
    [router],
  );

  const reset = useCallback(() => {
    resetMockState();
    setIndex(0);
    setPersona(null);
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (!DEMO_MODE) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyP") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open || isTyping(e.target) || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, go]);

  if (!DEMO_MODE) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-30 min-h-11 rounded-full border border-line bg-surface px-4 text-sm font-medium text-muted hover:text-navy"
        aria-label="Open presenter bar (Alt+P)"
      >
        Presenter
      </button>
    );
  }

  const step = DEMO_STEPS[index];
  return (
    <div
      role="region"
      aria-label="Presenter"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/20 bg-navy text-paper"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-sm">
            <span className="font-semibold">{step.id}</span> · {step.label}
            <span className="ml-2 text-paper/60">
              {index + 1} of {DEMO_STEPS.length}
            </span>
          </p>
          <p className="text-sm text-accent-light">{step.cue}</p>
        </div>
        <ol className="flex gap-1" aria-label="Demo steps">
          {DEMO_STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to step ${s.id}: ${s.label}`}
                aria-current={i === index ? "step" : undefined}
                className={`size-9 rounded-full text-sm font-semibold ${
                  i === index ? "bg-accent-light text-navy" : "text-paper/80 hover:bg-paper/10"
                }`}
              >
                {s.id}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-1">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={barBtn}>
            Back
          </button>
          <button type="button" onClick={() => go(index + 1)} disabled={index === DEMO_STEPS.length - 1} className={barBtn}>
            Next
          </button>
          <button type="button" onClick={reset} className={barBtn}>
            Reset
          </button>
          <button type="button" onClick={() => setOpen(false)} className={barBtn} aria-label="Hide presenter bar">
            Hide
          </button>
        </div>
        <p className="w-full text-xs text-paper/50">Left and Right arrow keys change step. Alt+P hides this bar.</p>
      </div>
    </div>
  );
}

const barBtn = "min-h-9 rounded-md border border-paper/30 px-3 text-sm font-medium hover:bg-paper/10 disabled:opacity-40";
