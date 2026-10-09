import Link from "next/link";
import { ArrowRight, Ban, Clock, Eye, Gauge, Layers, ShieldCheck } from "lucide-react";
import { Page } from "@/components/shell";
import { SearchForm } from "@/components/search-form";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, StatTile } from "@/components/ui/primitives";
import { TOOLS } from "@/lib/tools";

const FEATURES = [
  { icon: Eye, title: "Profiles, not just checkmarks", body: "Where a site makes it public, you get the avatar, display name, bio, follower counts and join date, so you can judge whether two accounts really line up." },
  { icon: ShieldCheck, title: "Honest about what it doesn’t know", body: "Every source ends as found, not found, or didn’t answer. A blocked or timed-out site is never shown to you as “no account”." },
  { icon: Gauge, title: "Live, never cached", body: "Each search asks every source right now and streams answers to you as they arrive. Most searches finish in under a minute." },
  { icon: Layers, title: "Cases for the leads that matter", body: "Save findings into cases with your own notes. Search results expire after six hours; cases stay until you delete them." },
  { icon: Clock, title: "History and export", body: "Re-open any search from the last 90 days. Download findings as CSV or JSON for your report or your own pipeline." },
  { icon: Ban, title: "Free. Actually free.", body: "No plans, no credits, no trial. Every search type, the deep search, the API and every tool cost nothing." },
];

export default function Home() {
  return (
    <Page className="py-0">
      <section className="relative grid items-center gap-12 py-16 md:grid-cols-[1.1fr_1fr] md:py-24">
        <div className="flex flex-col gap-6">
          <Badge tone="accent" className="self-start">Free · no limits · public sources</Badge>
          <h1 className="text-[2.5rem] leading-[1.1] font-semibold tracking-tight text-text md:text-[3.25rem]">
            One identifier in.<br /><span className="text-text-muted">Every public trace out.</span>
          </h1>
          <p className="max-w-lg text-base text-text-muted">
            Search a username, email address or domain across dozens of live sources at once. See each profile the source returns, with the evidence to judge it.
          </p>
          <div className="w-full max-w-xl"><SearchForm hero /></div>
        </div>
        <Card raised className="hidden flex-col gap-4 p-5 md:flex" aria-label="Example of a finished search">
          <div className="flex items-center justify-between text-sm"><span className="font-mono text-text">@sample_handle</span><Badge tone="success">Search complete</Badge></div>
          <div className="h-1.5 rounded-pill bg-success" />
          <div className="flex gap-8"><StatTile value="14" label="Found" /><StatTile value="25" label="No match" /><StatTile value="2" label="Unavailable" /></div>
          <ul className="flex flex-col gap-2">
            {[["Codeberg", "Sample Handle", "41 repos · joined 2017"], ["Lichess", "sample_handle", "2,310 games"], ["Bluesky", "Sample", "380 followers"]].map(([p, n, s]) => (
              <li key={p} className="flex items-center gap-3 rounded-md border border-border bg-surface p-3">
                <span className="grid size-9 place-items-center rounded-md bg-surface-2 text-xs text-text-muted" aria-hidden>{n.slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1"><span className="block text-xs uppercase tracking-wide text-text-subtle">{p}</span><span className="block truncate text-sm text-text">{n}</span></span>
                <span className="text-xs text-text-subtle">{s}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-subtle">Illustration. Real results depend on what each source makes public.</p>
        </Card>
      </section>

      <section aria-labelledby="h-how" className="border-t border-border py-16">
        <h2 id="h-how" className="mb-2 text-xl">How a search works</h2>
        <p className="mb-8 max-w-2xl text-sm text-text-muted">The same three steps for every identifier.</p>
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            ["Start from what you have", "A handle from a forum, an address from a phishing email, a domain from a report. Pick the type and search."],
            ["Watch the sources answer", "Each check runs live. Found accounts appear with their public details; misses and non-answers are listed separately."],
            ["Verify, then keep", "Open the original profile, compare details, and save what holds up into a case with your notes."],
          ].map(([t, b], i) => (
            <li key={t}><Card className="h-full p-5"><span className="font-mono text-sm text-accent">0{i + 1}</span><h3 className="mt-2 text-base font-medium text-text">{t}</h3><p className="mt-1 text-sm text-text-muted">{b}</p></Card></li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="h-feat" className="border-t border-border py-16">
        <h2 id="h-feat" className="mb-8 text-xl">Built for people who check their work</h2>
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex flex-col gap-2">
              <Icon className="size-5 text-accent" aria-hidden />
              <h3 className="text-base font-medium text-text">{title}</h3>
              <p className="text-sm text-text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-tools" className="border-t border-border py-16">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="h-tools" className="text-xl">{TOOLS.length} more tools, also free</h2>
            <p className="mt-1 text-sm text-text-muted">For when you have one specific question. Several run entirely in your browser.</p>
          </div>
          <LinkButton href="/tools/" variant="secondary" icon={<ArrowRight className="size-4" aria-hidden />}>All tools</LinkButton>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.slice(0, 8).map((t) => (
            <li key={t.slug}><Link href={`/tools/${t.slug}/`} className="block h-full"><Card interactive className="h-full p-4"><h3 className="text-sm font-medium text-text">{t.title}</h3><p className="mt-1 line-clamp-2 text-xs text-text-muted">{t.blurb}</p></Card></Link></li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="h-api" className="border-t border-border py-16">
        <Card className="flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="h-api" className="text-lg">Automate it with the API</h2>
            <p className="mt-1 max-w-xl text-sm text-text-muted">Start searches from your own scripts and stream findings back as JSON. Free API keys for every account.</p>
          </div>
          <LinkButton href="/docs/api/" variant="secondary">Read the API reference</LinkButton>
        </Card>
      </section>

      <section className="border-t border-border py-16 text-center">
        <h2 className="text-xl">Use it responsibly</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-text-muted">
          {"Only investigate people and organisations you are allowed to. A matching username is a lead, not an identity. "}
          <Link href="/how-it-works/" className="text-accent hover:underline">Read how results are checked</Link>.
        </p>
      </section>
    </Page>
  );
}
