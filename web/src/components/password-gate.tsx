"use client";

import { useState } from "react";
import { Pickaxe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/primitives";
import { data, DataError, useUser } from "@/lib/data";

// Private site: one account, no sign-up. The password screen signs into that account with
// Supabase Auth (so the server enforces it) and the session is remembered. Create the account
// in the Supabase dashboard with this email. The local dev API has no gate.
const EMAIL = process.env.NEXT_PUBLIC_GATE_EMAIL ?? "owner@quarryfind.example";

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const user = useUser();
  if (data.mode !== "supabase" || user) return <>{children}</>;
  if (user === undefined) return <div className="min-h-dvh bg-bg" aria-busy="true" />;
  return <GateForm />;
}

function GateForm() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await data.signInWithPassword(EMAIL, value); } // the gate opens on the auth change
    catch (err) { setError(err instanceof DataError ? err.message : "That didn’t work. Try again."); setValue(""); setBusy(false); }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-4" noValidate>
        <div className="flex items-center gap-2 text-text"><Pickaxe className="size-5 text-accent" aria-hidden /><span className="font-semibold">QuarryFind</span></div>
        <h1 className="text-lg text-text">This site is private</h1>
        <Input label="Password" type="password" autoComplete="current-password" autoFocus value={value} onChange={(e) => { setValue(e.target.value); setError(null); }} error={error ?? undefined} />
        <Button type="submit" loading={busy} disabled={!value || busy}>Enter</Button>
      </form>
    </main>
  );
}
