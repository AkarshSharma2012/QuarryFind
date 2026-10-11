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
  identity: "Identity", security: "Security", commerce: "Funding & shops", archive: "Archives",
};

const PROBLEMS: [string, string][] = [
  ["“Found” when nothing is there", "Many username checkers count a page that loaded as an account, so login walls, soft 404s and bot checks show up as matches."],
  ["Checks that quietly break", "Sites change their pages and APIs. A check that stopped working looks exactly like “no account”, and nobody tells you which is which."],
];

const PRINCIPLES: [string, string][] = [
  ["Why this counts, on every result", "Each finding says what matched: the site’s own API, a marker that only real profiles have, or the site’s proper not-found answer. You can judge the evidence instead of trusting a checkmark."],
  ["Checked daily, in public", "Every source is tested each day against an account that exists and a name that doesn’t. Sources that get it wrong are switched off, and the live status of all of them is on a public page."],
  ["Didn’t answer is not “no account”", "Every source ends as found, no match, or didn’t answer. A blocked or timed-out source is reported as unknown, so a short list never pretends to be a clean one."],
  ["Report a wrong result", "Spot a match that isn’t real, or a miss? One click sends it in, and that source is re-checked."],
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
        <section className="relative grid grid-cols-[minmax(0,1fr)] items-center gap-14 pb-20 pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-24">
          <div className="flex flex-col gap-7">
            <p className="eyebrow">Username · Email · Domain</p>
            <h1 className="max-w-[24ch] text-[2.5rem] font-semibold leading-[1.08] text-text sm:text-[3.25rem]">
              Find every account. See why each one counts.
            </h1>
            <p className="max-w-[52ch] text-base leading-7 text-text-muted">
              Check a handle, email address or domain against {SOURCES.length} public sources at once. Free, nothing to install, and every source is tested daily against a real account and a made-up one.
            </p>
            <div className="w-full max-w-xl"><SearchForm hero /></div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-text-subtle">
              <li>Free, no limits on features</li><li>Public sources only</li><li>Findings deleted after 6 h</li>
            </ul>
          </div>
          <ProductShot />
        </section>
      </div>

      <Section id="h-problem" label="The problem" title="Most lookups can’t tell you how sure they are">
        <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {PROBLEMS.map(([t, b]) => (
            <div key={t} className="bg-surface p-6"><dt className="text-base font-medium text-text">{t}</dt><dd className="mt-2 text-sm leading-6 text-text-muted">{b}</dd></div>
          ))}
        </dl>
      </Section>

      <Section id="h-principles" label="What’s different" title="Built to be checked, not trusted" intro="A search tool is only as good as its misses. These are the rules every source follows.">
        <dl className="divide-y divide-border border-y border-border">
          {PRINCIPLES.map(([t, b]) => (
            <div key={t} className="grid gap-2 py-6 sm:grid-cols-[220px_1fr] sm:gap-8">
              <dt className="text-sm font-medium text-text">{t}</dt>
              <dd className="text-sm leading-6 text-text-muted">{b}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap gap-6">
          <Link href="/sources/" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">See today’s source status <ArrowRight className="size-3.5" aria-hidden /></Link>
          <Link href="/how-it-works/" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">Read the full method <ArrowRight className="size-3.5" aria-hidden /></Link>
        </div>
      </Section>

      <Section id="h-sources" label="Coverage" title={`${SOURCES.length} sources, listed`} intro="Every count is generated from the code that runs your search. The full list, with today’s status for each source, is on the sources page.">
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
          {[...categories.map((c) => [CATEGORY_LABEL[c] ?? c, USERNAME.filter((x) => x.category === c)] as const),
            ["Email", byType("email")] as const, ["Domain", byType("domain")] as const].map(([label, list]) => {
            // Hand-written sources first: they return the richest profiles.
            const examples = [...list].sort((a, b) => Number(a.name.startsWith("wmn-")) - Number(b.name.startsWith("wmn-"))).slice(0, 6).map((s) => s.platform);
            return (
              <div key={label} className="flex flex-col gap-3 bg-surface p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-normal text-text">{label}</h3>
                  <span className="tabular font-mono text-2xl text-text">{list.length}</span>
                </div>
                <p className="text-[13px] leading-6 text-text-muted">{examples.join(", ")}{list.length > examples.length && <span className="text-text-subtle"> and {list.length - examples.length} more</span>}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4"><Link href="/sources/" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">See every source and its status today <ArrowRight className="size-3.5" aria-hidden /></Link></p>
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

      <Section id="h-price" label="Price" title="Free. No plans, no credits, no trial.">
        <p className="max-w-[60ch] text-sm leading-6 text-text-muted">Every search type, deep search, the API and every tool cost nothing. The only limits are there to stop abuse and keep sources from blocking us: 10 searches a minute, 3 running at once.</p>
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
