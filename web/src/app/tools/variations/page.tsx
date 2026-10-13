"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { ToolShell } from "@/components/tool-layout";
import { Card, Input } from "@/components/ui/primitives";
import { data, useUser } from "@/lib/data";
import { variations } from "@/lib/client-tools";
import { useToast } from "@/components/ui/toast";

function Inner() {
  const [q, setQ] = useState(useSearchParams().get("q") ?? "");
  const list = variations(q);
  const router = useRouter();
  const user = useUser();
  const toast = useToast();
  const search = async (v: string) => {
    if (!user) return;
    try { router.push(`/search/run/?id=${await data.startSearch("username", v, false)}`); } catch (e) { toast((e as Error).message, "error"); }
  };
  return (
    <>
      <Input label="Name or handle" inputSize="lg" placeholder="Jane Doe, or jdoe" value={q} onChange={(e) => setQ(e.target.value)} maxLength={80} autoFocus hint="Generated in your browser." />
      {list.length > 0 && (
        <Card className="p-4">
          <p className="mb-3 text-sm text-text-muted">{list.length} variations. Pick one to search across every source.</p>
          <ul className="flex flex-wrap gap-2">
            {list.map((v) => (
              <li key={v}>
                <button type="button" onClick={() => search(v)} className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface-2 px-3 py-1 font-mono text-sm text-text hover:border-accent">
                  {v} <Search className="size-3 text-text-subtle" aria-hidden /><span className="sr-only">search</span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

export default function VariationsTool() {
  return <ToolShell slug="variations"><Suspense><Inner /></Suspense></ToolShell>;
}
