import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Page } from "@/components/shell";
import { SearchForm } from "@/components/search-form";
import { LinkButton } from "@/components/ui/button";
import { TOOLS } from "@/lib/tools";
import SOURCES from "@/lib/sources.json";

const byType = (t: string) => SOURCES.filter((s) => s.types.includes(t));
const USERNAME = byType("username");
const CATEGORY_LABEL: Record<string, string> = {
  dev: "Developer", social: "Social", gaming: "Gaming", media: "Media", creative: "Creators", community: "Communities",
  identity: "Identity", security: "Security",
};

const PRINCIPLES: [string, string][] = [
  ["Three outcomes, never two", "Every source ends as found, no match, or didn’t answer. A blocked, rate-limited or timed-out source is reported as unknown, so a short list never pretends to be a clean one."],
  ["Evidence on the card", "Where a source publishes them, you get the display name, avatar, bio, counts and join date next to the link, so you can compare accounts before you connect them."],
  ["Checked against fixtures", "Each source is tested daily with a known account and a made-up one. Sources that drift are switched off rather than left to produce false positives."],
  ["Short memory by design", "Findings are deleted six hours after a search; history after 90 days. What you need to keep goes into a private case, with your notes."],
];

const SAMPLE = [
  { platform: "GitHub", who: "Sam Example", detail: "41 repos · since 2017", m: "strong" },
  { platform: "Codeberg", who: "sample_handle", detail: "12 followers", m: "strong" },
  { platform: "Lichess", who: "sample_handle", detail: "2,310 games", m: "strong" },
  { platform: "Bluesky", who: "Sam E.", detail: "380 followers", m: "strong" },
  { platform: "Patreon", who: "sample_handle", detail: "profile page", m: "likely" },
];

function ProductShot() {
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-surface shadow-pop" aria-label="Example of a finished username search">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" /><span className="size-2.5 rounded-full bg-border" /><span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 font-mono text-xs text-text-subtle">search / username / sample_handle</span>
      </div>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between font-mono text-xs">
          <span className="text-text">Complete</span>
          <span className="tabular text-text-subtle">{USERNAME.length} / {USERNAME.length} sources</span>
        </div>
        <div className="h-1 rounded-pill bg-success/80" />
        <dl className="grid grid-cols-3 gap-2 font-mono text-xs">
          {[["found", "14"], ["no match", "27"], ["no answer", "2"]].map(([k, v]) => (
            <div key={k}><dt className="text-text-subtle">{k}</dt><dd className="tabular text-base text-text">{v}</dd></div>
          ))}
        </dl>
      </div>
      <table className="w-full text-left text-[13px]">
        <thead className="eyebrow border-b border-border">
          <tr><th className="px-4 py-2 font-normal">Source</th><th className="px-4 py-2 font-normal">Profile</th><th className="hidden px-4 py-2 font-normal sm:table-cell">Evidence</th><th className="px-4 py-2 text-right font-normal">Match</th></tr>
        </thead>
        <tbody>
          {SAMPLE.map((r) => (
            <tr key={r.platform} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 text-text-muted">{r.platform}</td>
              <td className="px-4 py-2.5 text-text">{r.who}</td>
              <td className="hidden px-4 py-2.5 text-text-subtle sm:table-cell">{r.detail}</td>
              <td className="px-4 py-2.5 text-right">
                <span className={r.m === "strong" ? "text-success" : "text-accent"}>{r.m}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="border-t border-border px-4 py-2 text-xs text-text-subtle">Illustrative data. Real results depend on what each source makes public.</figcaption>
    </figure>
  );
}

function Section({ id, label, title, intro, children }: { id: string; label: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-8 border-t border-border py-20 lg:grid-cols-[280px_1fr] lg:gap-16">
      <div>
        <p className="eyebrow mb-3">{label}</p>
        <h2 id={id} className="text-xl font-semibold text-text">{title}</h2>
        {intro && <p className="mt-3 text-sm leading-6 text-text-muted">{intro}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function Home() {
  const categories = [...new Set(USERNAME.map((s) => s.category))];
  return (
    <Page className="py-0">
      <div className="relative">
        <div className="bg-grid pointer-events-none absolute inset-x-0 -top-14 h-[560px]" aria-hidden />
        <section className="relative grid items-center gap-14 pb-20 pt-16 lg:grid-cols-[1fr_1.05fr] lg:pt-24">
          <div className="flex flex-col gap-7">
            <p className="eyebrow">Username · Email · Domain</p>
            <h1 className="max-w-[19ch] text-[2.5rem] font-semibold leading-[1.08] text-text sm:text-[3.25rem]">
              Find where an identifier lives online.
            </h1>
            <p className="max-w-[52ch] text-base leading-7 text-text-muted">
              Check a handle, email address or domain against {SOURCES.length} public sources at once. Results stream in live, with the evidence each source returns and an honest record of what it couldn’t check.
            </p>
            <div className="w-full max-w-xl"><SearchForm hero /></div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-text-subtle">
              <li>Free, no limits on features</li><li>Public sources only</li><li>Findings deleted after 6 h</li>
            </ul>
          </div>
          <ProductShot />
        </section>
      </div>

      <Section id="h-principles" label="Method" title="Built to be checked, not trusted" intro="A search tool is only as good as its misses. These are the rules every source follows.">
        <dl className="divide-y divide-border border-y border-border">
          {PRINCIPLES.map(([t, b]) => (
            <div key={t} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
              <dt className="text-sm font-medium text-text">{t}</dt>
              <dd className="text-sm leading-6 text-text-muted">{b}</dd>
            </div>
          ))}
        </dl>
        <Link href="/how-it-works/" className="mt-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">Read the full method <ArrowRight className="size-3.5" aria-hidden /></Link>
      </Section>

      <Section id="h-sources" label="Coverage" title={`${SOURCES.length} sources, listed`} intro="Every count is generated from the code that runs your search. Open a category to see each source.">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {[...categories.map((c) => [CATEGORY_LABEL[c] ?? c, USERNAME.filter((x) => x.category === c)] as const),
            ["Email", byType("email")] as const, ["Domain", byType("domain")] as const].map(([label, list]) => (
            <details key={label} className="group bg-surface p-5 open:bg-surface-2/40">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <span className="text-sm text-text">{label}</span>
                <span className="tabular font-mono text-2xl text-text">{list.length}</span>
              </summary>
              <ul className="mt-4 max-h-64 overflow-y-auto pr-2 text-[13px] leading-6 text-text-muted">
                {list.map((s) => <li key={s.name} className="flex justify-between gap-2"><span className="truncate">{s.platform}</span>{s.deep && <span className="font-mono text-[11px] text-text-subtle">deep</span>}</li>)}
              </ul>
              <span className="mt-3 block font-mono text-[11px] text-text-subtle group-open:hidden">show list</span>
            </details>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-subtle">Includes {SOURCES.filter((s) => s.name.startsWith("wmn-")).length} sites derived from the <a className="underline hover:text-text" href="https://github.com/WebBreacher/WhatsMyName" target="_blank" rel="noopener noreferrer">WhatsMyName</a> project (CC BY-SA 4.0), each re-tested before inclusion.</p>
      </Section>

      <Section id="h-tools" label="Tools" title="One question at a time" intro="Focused utilities for the follow-up work. The ones marked local run entirely in your browser.">
        <ul className="divide-y divide-border border-y border-border">
          {TOOLS.map((t) => (
            <li key={t.slug}>
              <Link href={`/tools/${t.slug}/`} className="group grid items-baseline gap-1 py-3.5 sm:grid-cols-[220px_1fr_auto] sm:gap-8">
                <span className="text-sm text-text group-hover:text-accent">{t.title}</span>
                <span className="text-sm text-text-muted">{t.blurb}</span>
                <span className="hidden font-mono text-[11px] text-text-subtle sm:block">{t.server ? "" : "local"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="h-api" label="API" title="The same engine, as JSON" intro="Free keys for every account. Stream findings into your own pipeline as each source answers.">
        <pre tabIndex={0} aria-label="Example API request and streamed response" className="overflow-x-auto rounded-lg border border-border bg-surface p-5 font-mono text-[13px] leading-6 text-text-muted"><code>{`$ curl -N -X POST $API/v1/searches \\
    -H "Authorization: Bearer $KEY" \\
    -d '{"type":"email","query":"sam@example.com","stream":true}'

`}<span className="text-text-subtle">event:</span> result{`
`}<span className="text-text-subtle">data:</span>{` {"platform":"Gravatar","type":"profile","confidence":1, …}`}</code></pre>
        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/docs/api/" variant="secondary" icon={<ArrowUpRight className="size-4" aria-hidden />}>API reference</LinkButton>
        </div>
      </Section>

      <section className="border-t border-border py-20">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold text-text">Investigate responsibly.</h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-text-muted">Only look into people and organisations you have a legitimate reason to. A shared username is a lead, not an identity.</p>
          </div>
          <LinkButton href="/sign-up/" size="lg">Create a free account</LinkButton>
        </div>
      </section>
    </Page>
  );
}
