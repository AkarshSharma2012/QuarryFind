"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { data, useUser } from "@/lib/data";
import { Page, PageHeader, RequireUser } from "@/components/shell";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, Input } from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";

function Settings() {
  const user = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Settings" />
      <Card className="flex flex-col gap-1 p-5">
        <h2 className="text-base">Account</h2>
        <p className="text-sm text-text-muted">Signed in as <span className="text-text">{user?.email}</span></p>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div><h2 className="text-base">API keys</h2><p className="text-sm text-text-muted">Run searches from your own scripts.</p></div>
        <LinkButton href="/settings/api-keys/" variant="secondary" icon={<KeyRound className="size-4" aria-hidden />}>Manage keys</LinkButton>
      </Card>
      <Card className="flex flex-wrap items-center justify-between gap-3 border-danger/30 p-5">
        <div><h2 className="text-base">Delete account</h2><p className="text-sm text-text-muted">Deletes your history, cases and API keys straight away.</p></div>
        <Button variant="danger" onClick={() => setOpen(true)}>Delete account</Button>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete your account?"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" loading={busy} disabled={confirm !== "delete"} onClick={async () => { setBusy(true); await data.deleteAccount(); router.push("/"); }}>Delete forever</Button></>}>
        <div className="flex flex-col gap-3">
          <p>This can’t be undone. Type <span className="font-mono text-text">delete</span> to confirm.</p>
          <Input label="Confirmation" hideLabel value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </div>
      </Dialog>
    </div>
  );
}

export default function SettingsPage() {
  return <Page><RequireUser what="settings"><Settings /></RequireUser></Page>;
}
