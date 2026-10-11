"use client";

import { ExternalLink } from "lucide-react";
import { ProfileTool, Stat, KV } from "@/components/profile-tool";
import { ActivityChart, type Activity } from "@/components/activity-chart";
import { Badge, Card } from "@/components/ui/primitives";
import { safeHref } from "@/lib/safe-href";

interface RD {
  found: boolean; error?: string;
  profile: { url: string; name: string; avatar?: string; bio?: string; link_karma: number; comment_karma: number; total_karma: number; created?: string; verified_email?: boolean; is_mod?: boolean; suspended: boolean };
  communities: { name: string; count: number }[];
  recent: { kind: string; subreddit: string; title?: string; url: string; created?: string }[];
  activity: Activity;
}

export default function RedditTool() {
  return (
    <ProfileTool<RD> slug="reddit" render={(r) => (
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4 p-5 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.profile.avatar && <img src={r.profile.avatar} alt="" className="size-20 rounded-md" referrerPolicy="no-referrer" />}
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <a href={safeHref(r.profile.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-lg text-accent hover:underline">u/{r.profile.name} <ExternalLink className="size-4" aria-hidden /></a>
              {r.profile.suspended && <Badge tone="danger">Suspended</Badge>}
              {r.profile.is_mod && <Badge tone="accent">Moderator</Badge>}
            </div>
            {r.profile.bio && <p className="text-sm text-text-muted">{r.profile.bio}</p>}
            <div className="flex flex-wrap gap-6"><Stat label="Total karma" value={r.profile.total_karma} /><Stat label="Post karma" value={r.profile.link_karma} /><Stat label="Comment karma" value={r.profile.comment_karma} /></div>
            <KV items={[["Joined", r.profile.created && new Date(r.profile.created).toLocaleDateString(undefined, { dateStyle: "medium" })], ["Verified email", r.profile.verified_email === undefined ? undefined : r.profile.verified_email ? "yes" : "no"]]} />
          </div>
        </Card>
        <section aria-labelledby="h-act"><h2 id="h-act" className="mb-3 text-base">When they’re active</h2><Card className="p-5"><ActivityChart a={r.activity} /></Card></section>
        {r.communities.length > 0 && (
          <section aria-labelledby="h-subs">
            <h2 id="h-subs" className="mb-3 text-base">Most active communities</h2>
            <ul className="flex flex-wrap gap-2">{r.communities.map((c) => <li key={c.name}><a href={`https://www.reddit.com/r/${c.name}`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-pill border border-border px-3 py-1 text-sm text-text-muted hover:text-text">r/{c.name} <span className="text-text-subtle">· {c.count}</span></a></li>)}</ul>
          </section>
        )}
        {r.recent.length > 0 && (
          <section aria-labelledby="h-recent">
            <h2 id="h-recent" className="mb-3 text-base">Recent public activity</h2>
            <ul className="flex flex-col gap-2">{r.recent.map((x) => (
              <li key={x.url}><Card className="p-3 text-sm"><a href={safeHref(x.url)} target="_blank" rel="noopener noreferrer" className="text-text hover:text-accent">{x.title ?? "(no text)"}</a><p className="mt-1 text-xs text-text-subtle">{x.kind} in r/{x.subreddit}{x.created ? ` · ${new Date(x.created).toLocaleDateString()}` : ""}</p></Card></li>
            ))}</ul>
          </section>
        )}
      </div>
    )} />
  );
}
