import { ERROR_LABEL } from "@/lib/labels";
import type { DnaEntry } from "@/lib/types";

// Mistake DNA: each error type with a label, a bar and the marks lost, so colour is never the only signal.
export function DnaBars({ entries, limit = 5 }: { entries: DnaEntry[]; limit?: number }) {
  const top = entries.slice(0, limit);
  const max = Math.max(1, ...top.map((e) => e.marksLost));
  if (top.length === 0) return <p className="text-muted">No lost marks yet.</p>;
  return (
    <ul className="space-y-4">
      {top.map((e) => (
        <li key={e.errorType}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{ERROR_LABEL[e.errorType]}</span>
            <span className="hand text-2xl text-pen tnum">−{e.marksLost}</span>
          </div>
          <div className="mt-1 h-2 rounded-sm bg-line" role="img" aria-label={`${e.marksLost} marks lost`}>
            <div className="h-2 rounded-sm bg-accent" style={{ width: `${(e.marksLost / max) * 100}%` }} />
          </div>
          <p className="mt-1 text-sm text-muted">{e.topics.join(", ")}</p>
        </li>
      ))}
    </ul>
  );
}
