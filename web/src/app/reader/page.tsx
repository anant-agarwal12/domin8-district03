import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { ReaderScreen } from "@/components/ReaderScreen";

export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-muted">Opening the notes…</p>}>
        <ReaderScreen />
      </Suspense>
    </AppShell>
  );
}
