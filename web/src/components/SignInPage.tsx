"use client";

import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";

export function SignInPage() {
  const { signIn, signInError } = useAuth();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-5 py-10">
      <div>
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">xyz</p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Get your doubts solved, the right way.
        </h1>
        <p className="mt-3 text-muted">Sign in to continue.</p>
      </div>
      {signInError && <ErrorNotice title="Could not sign in" message={signInError} />}
      <button
        onClick={() => void signIn()}
        className="flex min-h-12 items-center justify-center gap-3 rounded-xl bg-accent px-5 font-semibold text-accent-ink shadow-sm transition hover:brightness-95 active:brightness-90"
      >
        Continue with Google
      </button>
    </main>
  );
}
