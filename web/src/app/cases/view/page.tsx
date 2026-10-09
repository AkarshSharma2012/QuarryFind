"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Trash2 } from "lucide-react";
import { data, type Case, type CaseItem } from "@/lib/data";
import { Page, RequireUser } from "@/components/shell";
import { ResultCard } from "@/components/result-card";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { download, fileSlug } from "@/lib/export";

function CaseView({ id }: { id: string }) {
  const router = useRouter();
  const toast = useToast();
  const [c, setC] = useState<Case | null | undefined>(undefined);
  const [items, setItems] = useState<CaseItem[]>([]);
  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    data.getCase(id).then((r) => {
      setC(r?.case ?? null);
      setItems(r?.items ?? []);
      setNotes(r?.case.notes ?? "");
      setName(r?.case.name ?? "");
    });
  }, [id]);

  const patch = (p: Partial<Pick<Case, "name" | "notes">>) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => data.updateCase(id, p), 500);
  };

  if (c === undefined) return <div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-32" /></div>;
  if (c === null) return <EmptyState title="Case not found" body="It may have been deleted." action={<LinkButton href="/cases/">All cases</LinkButton>} />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <label htmlFor="case-name" className="sr-only">Case name</label>
          <input id="case-name" value={name} maxLength={120} onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) patch({ name: e.target.value.trim() }); }}
            className="w-full truncate rounded-sm bg-transparent text-xl text-text hover:bg-surface focus:bg-surface" />
          <p className="text-sm text-text-muted">{items.length} saved finding{items.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={<Download className="size-4" aria-hidden />} disabled={!items.length}
            onClick={() => download(`${fileSlug(c.name)}.json`, JSON.stringify({ case: { ...c, name, notes }, items }, null, 2), "application/json")}>Export</Button>
          <Button variant="danger" size="sm" icon={<Trash2 className="size-4" aria-hidden />} onClick={() => setConfirm(true)}>Delete case</Button>
        </div>
      </div>

      <section aria-labelledby="h-notes">
        <h2 id="h-notes" className="mb-2 text-sm text-text-muted">Notes</h2>
        <textarea aria-labelledby="h-notes" value={notes} onChange={(e) => { setNotes(e.target.value); patch({ notes: e.target.value }); }} rows={4} maxLength={20000}
          placeholder="What you’ve confirmed, what’s still a guess, and where it came from."
          className="w-full rounded-md border border-border-input bg-surface p-3 text-sm text-text placeholder:text-text-subtle" />
      </section>

      <section aria-labelledby="h-items" className="flex flex-col gap-4">
        <h2 id="h-items" className="text-lg">Saved findings</h2>
        {items.length === 0 ? <Card><EmptyState title="Nothing saved yet" body="Run a search and press Save on a finding to keep it in this case." action={<LinkButton href="/search/" size="sm">New search</LinkButton>} /></Card> : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((it) => (
              <li key={it.id} className="flex flex-col gap-2">
                <ResultCard r={{ run_id: it.source_run_id ?? "", seq: 0, type: "account", platform: it.platform, category: null, value: it.value, confidence: it.confidence, source: it.source, metadata: it.metadata, created_at: it.saved_at }} />
                <p className="px-1 text-xs text-text-subtle">From {it.query_type} search “{it.query}” · {new Date(it.saved_at).toLocaleDateString()}</p>
                <div className="flex gap-2 px-1">
                  <Button size="sm" variant="ghost" onClick={async () => { await data.removeCaseItem(it.id); setItems((xs) => xs.filter((x) => x.id !== it.id)); toast("Removed from case"); }}>Remove</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Delete this case?"
        footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button variant="danger" onClick={async () => { await data.deleteCase(id); router.push("/cases/"); }}>Delete</Button></>}>
        This deletes “{name}” and its {items.length} saved finding{items.length === 1 ? "" : "s"}. It can’t be undone.
      </Dialog>
    </div>
  );
}

function Inner() {
  const id = useSearchParams().get("id") ?? "";
  return id ? <CaseView id={id} /> : <EmptyState title="No case selected" action={<LinkButton href="/cases/">All cases</LinkButton>} />;
}

export default function CasePage() {
  return <Page><RequireUser what="cases"><Suspense><Inner /></Suspense></RequireUser></Page>;
}
