"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { data, DataError, type Case } from "@/lib/data";
import { Page, PageHeader, RequireUser } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, EmptyState, Input, Skeleton } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

function CasesList() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[] | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { data.listCases().then(setCases); }, []);

  const create = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setError(null);
    try { const c = await data.createCase(name); router.push(`/cases/view/?id=${c.id}`); }
    catch (err) { setError(err instanceof DataError ? err.message : "Couldn’t create the case."); setBusy(false); }
  };

  const newBtn = <Button onClick={() => setOpen(true)} icon={<Plus className="size-4" aria-hidden />}>New case</Button>;

  return (
    <>
      <PageHeader title="Cases" sub="Folders for findings you want to keep. Saved findings stay until you delete them." actions={newBtn} />
      {cases === null ? <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        : cases.length === 0 ? <Card><EmptyState icon={<FolderOpen className="size-8" />} title="No cases yet" body="Create a case, then use Save on any finding to keep a copy of it here." action={newBtn} /></Card>
          : (
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link href={`/cases/view/?id=${c.id}`} className="block h-full">
                    <Card interactive className="flex h-full flex-col gap-2 p-5">
                      <h2 className="truncate text-base font-medium text-text" title={c.name}>{c.name}</h2>
                      <p className="line-clamp-2 text-sm text-text-muted">{c.notes || "No notes yet."}</p>
                      <p className="mt-auto pt-2 text-xs text-text-subtle">{c.item_count ?? 0} saved · updated {new Date(c.updated_at).toLocaleDateString()}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
      <Dialog open={open} onClose={() => setOpen(false)} title="New case"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => create()} loading={busy} disabled={!name.trim()}>Create</Button></>}>
        <form onSubmit={create} className="flex flex-col gap-2">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="e.g. Phishing report #42" autoFocus error={error ?? undefined} />
        </form>
      </Dialog>
    </>
  );
}

export default function CasesPage() {
  return <Page><RequireUser what="cases"><CasesList /></RequireUser></Page>;
}
