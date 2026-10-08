"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { api } from "@/lib/api";
import { auth, firebaseConfigured, googleProvider } from "@/lib/firebase";
import type { User } from "@/lib/types";

type Status = "loading" | "signed_out" | "signed_in";

type AuthState = {
  status: Status;
  profile: User | null; // from GET /me
  profileError: string | null;
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(firebaseConfigured ? "loading" : "signed_out");
  const [profile, setProfile] = useState<User | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(
    firebaseConfigured
      ? null
      : "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables in web/.env.local.",
  );

  const reloadProfile = useCallback(async () => {
    setProfileError(null);
    try {
      setProfile(await api.getMe());
    } catch (e) {
      setProfile(null);
      setProfileError(message(e));
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setProfile(null);
        setProfileError(null);
        setStatus("signed_out");
        return;
      }
      setStatus("signed_in");
      void reloadProfile();
    });
  }, [reloadProfile]);

  const signIn = useCallback(async () => {
    if (!auth) return;
    setSignInError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setSignInError(message(e));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (auth) await fbSignOut(auth);
  }, []);

  const value = useMemo(
    () => ({ status, profile, profileError, signInError, signIn, signOut, reloadProfile }),
    [status, profile, profileError, signInError, signIn, signOut, reloadProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
