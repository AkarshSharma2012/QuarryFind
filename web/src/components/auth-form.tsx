"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { data, DataError } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";

function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="currentColor">
      <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.05-.49.05-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.65-.89-3.65-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.6 7.6 0 0 1 8 3.87c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/search/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const signUp = mode === "sign-up";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (signUp) {
        const r = await data.signUp(email.trim(), password);
        if (r.needsConfirmation) { setSent(true); return; }
      } else {
        await data.signInWithPassword(email.trim(), password);
      }
      router.push(next);
    } catch (err) {
      setError(err instanceof DataError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const oauth = async (p: "github" | "google") => {
    setError(null);
    setBusy(p);
    try { await data.signInWithOAuth(p); if (data.mode === "local") router.push(next); }
    catch (err) { setError(err instanceof DataError ? err.message : "That sign-in didn’t work."); setBusy(null); }
  };

  if (sent) {
    return (
      <Card className="mx-auto flex max-w-sm flex-col gap-2 p-6 text-center">
        <h1 className="text-lg">Check your inbox</h1>
        <p className="text-sm text-text-muted">We sent a confirmation link to <span className="text-text">{email}</span>. Open it to finish creating your account.</p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto flex w-full max-w-sm flex-col gap-5 p-6">
      <div>
        <h1 className="text-lg">{signUp ? "Create your free account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-text-muted">{signUp ? "No card, no trial. Every feature is free." : "Welcome back."}</p>
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" onClick={() => oauth("github")} loading={busy === "github"} disabled={!!busy} icon={<GithubMark />}>Continue with GitHub</Button>
        <Button variant="secondary" onClick={() => oauth("google")} loading={busy === "google"} disabled={!!busy}>Continue with Google</Button>
      </div>
      <div className="flex items-center gap-3 text-xs text-text-subtle"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input
          label="Password" type="password" autoComplete={signUp ? "new-password" : "current-password"} required minLength={8}
          value={password} onChange={(e) => setPassword(e.target.value)} hint={signUp ? "At least 8 characters." : undefined}
        />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" loading={busy === "email"} disabled={!!busy}>{signUp ? "Create account" : "Sign in"}</Button>
      </form>
      <p className="text-center text-sm text-text-muted">
        {signUp ? "Already have an account? " : "New here? "}
        <Link className="text-accent hover:underline" href={`/${signUp ? "sign-in" : "sign-up"}/?next=${encodeURIComponent(next)}`}>{signUp ? "Sign in" : "Create a free account"}</Link>
      </p>
      {signUp && <p className="text-center text-xs text-text-subtle">By creating an account you agree to the <Link href="/terms/" className="underline">terms</Link>: lawful, authorised use only.</p>}
    </Card>
  );
}
