"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { PageHeader } from "./Page";
import { EmptyState, Loading } from "./states";

export function AttemptsList() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "";
  const { data, error, retry } = useLoad(uid, () => api.listAttempts(uid));
  const items = data?.items ?? null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My attempts" />
      {error ? (
        <ErrorNotice title="Could not load your attempts" message={error} onRetry={retry} />
      ) : !items ? (
        <Loading label="Loading attempts…" />
      ) : items.length === 0 ? (
        <EmptyState title="No attempts yet">
          <Link href="/answer" className="font-medium text-accent underline">Answer a question</Link> to see your marks here.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/attempts/${encodeURIComponent(a.id)}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm hover:border-navy/30"
              >
                <div className="min-w-0">
                  <p className="text-lg font-bold text-pen">{a.total} / {a.max}</p>
                  <p className="text-sm text-muted">
                    {new Date(a.gradedAt).toLocaleString()} · {a.inputType === "photo" ? "Photo" : "Typed"}
                  </p>
                </div>
                {a.confidence === "low" && (
                  <span className="shrink-0 rounded-full bg-warn-bg px-2.5 py-1 text-xs font-semibold text-warn">Teacher will check</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
