"use client";

import { ExternalLink, Star } from "lucide-react";
import { ProfileTool, Stat, KV } from "@/components/profile-tool";
import { ActivityChart, type Activity } from "@/components/activity-chart";
import { Card } from "@/components/ui/primitives";
import { safeHref } from "@/lib/safe-href";

interface GH {
  found: boolean; error?: string;
  profile: { url: string; avatar?: string; name?: string; login: string; bio?: string; company?: string; blog?: string; location?: string; email?: string; twitter?: string; followers: number; following: number; public_repos: number; gists: number; created: string; updated: string };
  languages: { name: string; repos: number }[];
  repos: { name: string; url: string; description?: string; stars: number; language?: string; pushed: string }[];
  commit_identities: { name: string; email: string; count: number }[];
  activity: Activity;
}

const d = (s?: string) => (s ? new Date(s).toLocaleDateString(undefined, { dateStyle: "medium" }) : undefined);

export default function GithubTool() {
  return (
    <ProfileTool<GH> slug="github" render={(r) => (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.profile.avatar && <img src={r.profile.avatar} alt="" className="size-20 rounded-md" referrerPolicy="no-referrer" />}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <h2 className="text-lg text-text">{r.profile.name ?? r.profile.login}</h2>
              <a href={safeHref(r.profile.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-sm text-accent hover:underline">@{r.profile.login} <ExternalLink className="size-3.5" aria-hidden /></a>
            </div>
            {r.profile.bio && <p className="text-sm text-text-muted">{r.profile.bio}</p>}
            <div className="flex flex-wrap gap-6">
              <Stat label="Repos" value={r.profile.public_repos} /><Stat label="Followers" value={r.profile.followers} /><Stat label="Following" value={r.profile.following} /><Stat label="Gists" value={r.profile.gists} />
            </div>
            <KV items={[["Company", r.profile.company], ["Location", r.profile.location], ["Website", r.profile.blog], ["Public email", r.profile.email], ["X / Twitter", r.profile.twitter && `@${r.profile.twitter}`], ["Joined", d(r.profile.created)], ["Last updated", d(r.profile.updated)]]} />
          </div>
        </Card>

        {r.commit_identities.length > 0 && (
          <section aria-labelledby="h-ids">
            <h2 id="h-ids" className="mb-1 text-base">Identities in public commits</h2>
            <p className="mb-3 text-xs text-text-subtle">Name and email written into commits this account pushed recently. Git lets anyone type any name; corroborate before relying on it.</p>
            <Card className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-wide text-text-subtle"><tr><th scope="col" className="px-4 py-2 font-medium">Name</th><th scope="col" className="px-4 py-2 font-medium">Email</th><th scope="col" className="px-4 py-2 font-medium">Commits</th></tr></thead>
                <tbody>{r.commit_identities.map((c) => <tr key={c.name + c.email} className="border-b border-border last:border-0"><td className="px-4 py-2 text-text">{c.name}</td><td className="break-all px-4 py-2 font-mono text-xs text-text-muted">{c.email}</td><td className="px-4 py-2 tabular-nums text-text-muted">{c.count}</td></tr>)}</tbody>
              </table>
            </Card>
          </section>
        )}

        <section aria-labelledby="h-act"><h2 id="h-act" className="mb-3 text-base">When they’re active</h2><Card className="p-5"><ActivityChart a={r.activity} /></Card></section>

        {r.languages.length > 0 && (
          <section aria-labelledby="h-lang">
            <h2 id="h-lang" className="mb-3 text-base">Languages</h2>
            <ul className="flex flex-wrap gap-2">{r.languages.map((l) => <li key={l.name} className="rounded-pill border border-border px-3 py-1 text-sm text-text-muted">{l.name} <span className="text-text-subtle">· {l.repos}</span></li>)}</ul>
          </section>
        )}

        {r.repos.length > 0 && (
          <section aria-labelledby="h-repos">
            <h2 id="h-repos" className="mb-3 text-base">Recently pushed repositories</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {r.repos.map((x) => (
                <li key={x.url}><Card className="flex h-full flex-col gap-1 p-4">
                  <a href={safeHref(x.url)} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-sm text-accent hover:underline">{x.name}</a>
                  {x.description && <p className="line-clamp-2 text-sm text-text-muted">{x.description}</p>}
                  <p className="mt-auto flex items-center gap-3 pt-1 text-xs text-text-subtle">{x.language && <span>{x.language}</span>}<span className="inline-flex items-center gap-1"><Star className="size-3" aria-hidden />{x.stars}</span><span>pushed {d(x.pushed)}</span></p>
                </Card></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )} />
  );
}
