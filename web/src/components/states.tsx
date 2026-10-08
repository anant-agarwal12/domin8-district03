import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-10 text-muted" role="status" aria-busy="true">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-base focus:border-navy/40";
export const btnPrimary =
  "rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-ink disabled:opacity-50";
export const btnGhost =
  "rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium hover:border-navy/30 disabled:opacity-50";
