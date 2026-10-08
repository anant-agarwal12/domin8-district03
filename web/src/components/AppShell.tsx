"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { SignInPage } from "./SignInPage";

const NAV = [
  { href: "/questions/new", label: "New question" },
  { href: "/answer", label: "Answer" },
  { href: "/attempts", label: "My attempts" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, profileError, signOut, reloadProfile } = useAuth();

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" aria-busy="true">
        Loading…
      </div>
    );
  }
  if (status === "signed_out") return <SignInPage />;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-accent">
            xyz
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {profile && (
              <p className="min-w-0 truncate text-sm">
                <span className="font-medium">{profile.name}</span>
                <span className="ml-2 rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium capitalize">
                  {profile.role}
                </span>
              </p>
            )}
            <button
              onClick={() => void signOut()}
              className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-navy/30"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-3 pb-2" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-navy/5 hover:text-navy"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {profileError ? (
          <ErrorNotice
            title="Could not load your profile"
            message={profileError}
            onRetry={() => void reloadProfile()}
          />
        ) : profile ? (
          children
        ) : (
          <p className="text-muted" aria-busy="true">
            Loading your profile…
          </p>
        )}
      </main>
    </div>
  );
}
