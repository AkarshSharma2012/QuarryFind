"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Globe, Mail, Search, User } from "lucide-react";
import { data, DataError, useUser } from "@/lib/data";
import type { SearchType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input, SegmentedControl, Switch } from "@/components/ui/primitives";

const COPY: Record<SearchType, { label: string; placeholder: string; prefix?: string; hint: string }> = {
  username: { label: "Username", placeholder: "handle", prefix: "@", hint: "Checks developer, social, gaming and creator sites for this exact handle." },
  email: { label: "Email address", placeholder: "name@example.com", hint: "Public signals only: Gravatar, commit history, PGP keys, mail setup." },
  domain: { label: "Domain", placeholder: "example.com", hint: "WHOIS, DNS, mail security, subdomains, archive history and web stack." },
};

const VALID: Record<SearchType, RegExp> = {
  username: /^@?[A-Za-z0-9._-]{1,64}$/,
  email: /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/,
  domain: /^(https?:\/\/)?([A-Za-z0-9-]+\.)+[A-Za-z]{2,}(\/.*)?$/,
};

export function SearchForm({ initialType = "username", initialQuery = "", hero }: { initialType?: SearchType; initialQuery?: string; hero?: boolean }) {
  const router = useRouter();
  const user = useUser();
  const [type, setType] = useState<SearchType>(initialType);
  const [query, setQuery] = useState(initialQuery);
  const [deep, setDeep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const c = COPY[type];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!VALID[type].test(q)) { setError(`That doesn’t look like a ${c.label.toLowerCase()}.`); return; }
    setError(null);
    if (!user) return; // the password screen signs you in before anything else shows
    setBusy(true);
    try {
      const id = await data.startSearch(type, q, deep);
      router.push(`/search/run/?id=${id}`);
    } catch (err) {
      setError(err instanceof DataError ? err.message : "Couldn’t start the search. Try again.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4" noValidate>
      <SegmentedControl
        label="What are you searching for?"
        value={type}
        onChange={(t) => { setType(t); setError(null); }}
        options={[
          { value: "username", label: "Username", icon: <User className="size-4" aria-hidden /> },
          { value: "email", label: "Email", icon: <Mail className="size-4" aria-hidden /> },
          { value: "domain", label: "Domain", icon: <Globe className="size-4" aria-hidden /> },
        ]}
      />
      <Input
        label={c.label}
        hideLabel
        inputSize="lg"
        prefix={c.prefix}
        placeholder={c.placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setError(null); }}
        error={error ?? undefined}
        hint={error ? undefined : c.hint}
        autoComplete="off"
        spellCheck={false}
        autoFocus={!hero}
        maxLength={320}
        trailing={<Button type="submit" loading={busy} icon={<Search className="size-4" aria-hidden />}>Search</Button>}
      />
      {type === "username" && (
        <Switch label="Deep search" description="Adds slower sources such as Medium, Twitch and DeviantArt." checked={deep} onChange={setDeep} disabled={busy} />
      )}
    </form>
  );
}
