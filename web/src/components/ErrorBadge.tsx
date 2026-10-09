import { ERROR_LABEL } from "@/lib/labels";
import type { ErrorType } from "@/lib/types";
import { CrossIcon } from "./Icons";

// Error types always carry a label and an icon, never colour alone.
export function ErrorBadge({ type }: { type: ErrorType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-pen/40 bg-hl/60 px-2.5 py-0.5 text-sm font-medium text-pen">
      <CrossIcon className="size-4" />
      {ERROR_LABEL[type]}
    </span>
  );
}
