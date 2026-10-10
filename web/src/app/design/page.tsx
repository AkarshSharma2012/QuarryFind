"use client";

import { useState } from "react";
import { AtSign, Globe, Mail, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Badge, Card, CodeBlock, EmptyState, Input, ProgressBar, SegmentedControl, Skeleton, StatTile, Switch,
} from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ResultCard } from "@/components/result-card";
import type { SearchResult } from "@/lib/types";

const sample: SearchResult[] = [
  {
    run_id: "x", seq: 1, type: "account", platform: "Codeberg", category: "dev", value: "https://codeberg.org/sample",
    confidence: 1, source: "codeberg", created_at: "",
    metadata: { display_name: "Sam Example", handle: "sample", bio: "Writes compilers for fun. Lives in a terminal.", stats: [{ label: "Repos", value: 41 }, { label: "Followers", value: 120 }, { label: "Joined", value: 2017 }] },
  },
  { run_id: "x", seq: 2, type: "account", platform: "Lichess", category: "gaming", value: "https://lichess.org/@/sample", confidence: 0.7, source: "lichess", created_at: "", metadata: {} },
  { run_id: "x", seq: 3, type: "lead", platform: "Email local part", category: null, value: "sample", confidence: 0.3, source: "email-localpart", created_at: "", metadata: {} },
];

export default function DesignPage() {
  const [type, setType] = useState<"email" | "username" | "domain">("username");
  const [premium, setPremium] = useState(false);
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12">
      <header>
        <h1 className="text-xl">Design system</h1>
        <p className="text-sm text-text-muted">Every primitive, every state. Internal page.</p>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="h-buttons">
        <h2 id="h-buttons" className="text-lg">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm" variant="secondary">Small</Button>
          <Button size="lg" icon={<Search className="size-4" aria-hidden />}>Large</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="h-badges">
        <h2 id="h-badges" className="text-lg">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge><Badge tone="accent">Accent</Badge><Badge tone="success">Strong match</Badge>
          <Badge tone="warning">Unavailable</Badge><Badge tone="danger">Error</Badge><Badge tone="outline">Outline</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="h-forms">
        <h2 id="h-forms" className="text-lg">Form controls</h2>
        <SegmentedControl
          label="Search type"
          value={type}
          onChange={setType}
          options={[
            { value: "username", label: "Username", icon: <User className="size-4" aria-hidden /> },
            { value: "email", label: "Email", icon: <Mail className="size-4" aria-hidden /> },
            { value: "domain", label: "Domain", icon: <Globe className="size-4" aria-hidden /> },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Username" prefix="@" placeholder="handle" />
          <Input label="Email" placeholder="name@example.com" error="That doesn’t look like an email address." defaultValue="name@" />
          <Input label="Disabled" disabled placeholder="Search in progress" />
          <Input label="With hint" hint="Letters, numbers, dots, dashes and underscores." />
        </div>
        <Input
          label="Search" hideLabel inputSize="lg" placeholder="Enter a username" prefix={undefined}
          trailing={<Button icon={<AtSign className="size-4" aria-hidden />}>Search</Button>}
        />
        <Switch label="Deep search" description="Adds slower sources. Takes a bit longer." checked={premium} onChange={setPremium} />
        <Switch label="Disabled switch" description="Shown while a search is running." checked={false} onChange={() => {}} disabled />
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="h-data">
        <h2 id="h-data" className="text-lg">Progress and stats</h2>
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex justify-between text-sm"><span>Checking sources</span><span className="tabular-nums text-text-muted">212 / 480</span></div>
          <ProgressBar value={212} max={480} label="Sources checked" />
          <ProgressBar value={480} max={480} label="Done" tone="success" />
          <ProgressBar value={480} max={480} label="Partial" tone="warning" />
        </Card>
        <div className="flex gap-8"><StatTile value="482" label="Sources" /><StatTile value="14" label="Found" /><StatTile value="9" label="Unavailable" /></div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="h-results">
        <h2 id="h-results" className="text-lg">Result cards</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <ResultCard r={sample[0]} onSave={() => toast("Saved to case", "success")} />
          <ResultCard r={sample[1]} saved onSave={() => {}} />
          <ResultCard r={sample[2]} onSearchLead={() => {}} />
        </div>
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="h-misc">
        <h2 id="h-misc" className="text-lg">Dialog, toast, empty, skeleton, code</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => toast("Something went wrong.", "error")}>Error toast</Button>
        </div>
        <Dialog
          open={open} onClose={() => setOpen(false)} title="Delete case?"
          footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => setOpen(false)}>Delete</Button></>}
        >
          This removes the case and its 12 saved findings. It can’t be undone.
        </Dialog>
        <Card><EmptyState icon={<Search className="size-8" />} title="No searches yet" body="Run a search and it shows up here for 90 days." action={<Button size="sm">New search</Button>} /></Card>
        <div className="flex flex-col gap-2"><Skeleton className="h-10" /><Skeleton className="h-10 w-2/3" /></div>
        <CodeBlock lang="bash" code={`curl -N https://api.example.com/v1/searches \\\n  -H "Authorization: Bearer qf_live_..." \\\n  -d '{"type":"username","query":"sample","stream":true}'`} />
      </section>
    </main>
  );
}
