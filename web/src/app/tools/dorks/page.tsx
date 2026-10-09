"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ToolShell } from "@/components/tool-layout";
import { Card, Input, SegmentedControl } from "@/components/ui/primitives";
import { dorks, ENGINES } from "@/lib/client-tools";

type Kind = "person" | "username" | "email" | "domain";

export default function DorksTool() {
  const [kind, setKind] = useState<Kind>("person");
  const [q, setQ] = useState("");
  const list = dorks(kind, q);
  return (
    <ToolShell slug="dorks">
      <SegmentedControl label="Target type" value={kind} onChange={setKind} options={[{ value: "person", label: "Person" }, { value: "username", label: "Username" }, { value: "email", label: "Email" }, { value: "domain", label: "Domain" }]} />
      <Input label={kind === "person" ? "Full name" : kind === "domain" ? "Domain" : kind === "email" ? "Email address" : "Username"} inputSize="lg" value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} />
      {list.length > 0 && (
        <ul className="flex flex-col gap-3">
          {list.map((d) => (
            <li key={d.label}>
              <Card className="flex flex-col gap-2 p-4">
                <p className="text-sm text-text">{d.label}</p>
                <code className="break-all rounded-sm bg-surface-2 px-2 py-1 font-mono text-xs text-text-muted">{d.query}</code>
                <div className="flex flex-wrap gap-3">
                  {ENGINES.map((e) => <a key={e.name} href={e.url(d.query)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">{e.name} <ExternalLink className="size-3.5" aria-hidden /></a>)}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </ToolShell>
  );
}
