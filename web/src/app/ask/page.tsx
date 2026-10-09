import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { AskScreen } from "@/components/AskScreen";

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AskScreen />
      </Suspense>
    </AppShell>
  );
}
