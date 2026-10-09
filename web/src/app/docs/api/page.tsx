import type { Metadata } from "next";
import Link from "next/link";
import { Page } from "@/components/shell";
import { CodeBlock } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "API reference" };

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.example.com";

const TOC = [["auth", "Authentication"], ["start", "Start a search"], ["stream", "Streaming"], ["get", "Get a search"], ["list", "List searches"], ["result", "Result object"], ["outcomes", "Outcomes"], ["meta", "Account and discovery"], ["errors", "Errors and limits"]];

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-20 pt-6 text-lg text-text">{children}</h2>;
}

export default function ApiRef() {
  return (
    <Page>
      <div className="grid gap-10 lg:grid-cols-[200px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-20 flex flex-col gap-1.5 text-sm">{TOC.map(([id, t]) => <li key={id}><a href={`#${id}`} className="text-text-muted hover:text-text">{t}</a></li>)}</ul>
        </nav>
        <article className="flex min-w-0 max-w-3xl flex-col gap-4 text-sm leading-6 text-text-muted">
          <header>
            <h1 className="text-xl text-text">API reference · v1</h1>
            <p className="mt-1">Base URL <code className="font-mono text-text">{BASE}</code>. JSON in, JSON out. Free for every account.</p>
          </header>

          <H id="auth">Authentication</H>
          <p>Create a key on the <Link className="text-accent hover:underline" href="/settings/api-keys/">API keys</Link> page and send it as a bearer token (or in an <code className="font-mono">X-API-Key</code> header). Keys are shown once; we only store a hash.</p>
          <CodeBlock lang="http" code={`Authorization: Bearer osk_live_...`} />

          <H id="start">Start a search</H>
          <p><code className="font-mono text-text">POST /v1/searches</code></p>
          <ul className="ml-5 list-disc">
            <li><code className="font-mono">type</code>: <code className="font-mono">username</code>, <code className="font-mono">email</code> or <code className="font-mono">domain</code> (required)</li>
            <li><code className="font-mono">query</code>: the identifier (required)</li>
            <li><code className="font-mono">deep</code>: add slower username sources (default false)</li>
            <li><code className="font-mono">wait</code>: hold the request up to 30 s and return results inline if done (default false)</li>
            <li><code className="font-mono">stream</code>: respond with Server-Sent Events (default false; wins over wait)</li>
          </ul>
          <CodeBlock lang="bash" code={`curl -X POST ${BASE}/v1/searches \\
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"type":"username","query":"sample_handle"}'

{"run_id":"6c1e…","status":"running"}`} />

          <H id="stream">Streaming</H>
          <p>With <code className="font-mono">stream: true</code>, or <code className="font-mono">GET /v1/searches/{"{id}"}/stream</code> for a search already running, you get events as each source answers:</p>
          <ul className="ml-5 list-disc">
            <li><code className="font-mono">run</code>: once, first: id, type, query.</li>
            <li><code className="font-mono">result</code>: one finding, the moment it lands.</li>
            <li><code className="font-mono">progress</code>: sources completed / total, hits, and sources that didn’t answer.</li>
            <li><code className="font-mono">done</code>: once, last: final status and counts.</li>
            <li><code className="font-mono">reconnect</code>: the connection hit its time limit (about 140 s) but the search continues. Re-attach to the stream URL; don’t start a new search.</li>
          </ul>
          <CodeBlock lang="bash" code={`curl -N -X POST ${BASE}/v1/searches \\
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\
  -d '{"type":"domain","query":"example.com","stream":true}'

event: run
data: {"run_id":"6c1e…","type":"domain","query":"example.com","status":"running"}

event: result
data: {"id":1,"type":"record","platform":"DNS records","value":"example.com", …}

event: progress
data: {"modules_total":6,"modules_completed":3,"modules_with_hits":3,"modules_failed":0}

event: done
data: {"run_id":"6c1e…","status":"completed","total_results":6, …}`} />

          <H id="get">Get a search</H>
          <p><code className="font-mono text-text">GET /v1/searches/{"{id}"}</code> returns the run, its findings so far and progress. Poll every 2–5 s if you aren’t streaming. Findings are deleted 6 hours after the search; after that <code className="font-mono">results_purged_at</code> is set and <code className="font-mono">results</code> is empty.</p>

          <H id="list">List searches</H>
          <p><code className="font-mono text-text">GET /v1/searches?limit=20</code>: your recent searches (metadata only), newest first. Limit 1–100.</p>

          <H id="result">Result object</H>
          <CodeBlock lang="json" code={`{
  "id": 3,                       // sequential within the search
  "type": "profile",             // profile | account | record | lead
  "platform": "Codeberg",
  "category": "dev",
  "value": "https://codeberg.org/sample",
  "confidence": 1.0,             // 0–1
  "source": "codeberg",          // module id
  "metadata": { "display_name": "…", "avatar": "…", "bio": "…", "stats": [ … ], "records": [ … ] },
  "created_at": "2026-10-09T12:00:00Z"
}`} />

          <H id="outcomes">Outcomes</H>
          <p>Each source ends as <code className="font-mono">hit</code>, <code className="font-mono">absent</code>, <code className="font-mono">inconclusive</code> or <code className="font-mono">error</code>. Treat inconclusive as unknown, never as absent. A done event with <code className="font-mono">modules_failed &gt; 0</code> is partial coverage. See <Link className="text-accent hover:underline" href="/how-it-works/">how results are checked</Link>.</p>

          <H id="meta">Account and discovery</H>
          <ul className="ml-5 list-disc">
            <li><code className="font-mono">GET /v1/me</code>: checks your key; returns your user id and rate limits.</li>
            <li><code className="font-mono">GET /v1/health</code>: service status (no key needed).</li>
            <li><code className="font-mono">GET /v1/capabilities</code>: search types, modes, limits and the result schema as JSON (no key needed).</li>
          </ul>

          <H id="errors">Errors and limits</H>
          <p>Errors look like <code className="font-mono">{`{"error":"code","message":"…"}`}</code>.</p>
          <ul className="ml-5 list-disc">
            <li><code className="font-mono">400 invalid_request</code>: unknown type or an invalid query.</li>
            <li><code className="font-mono">401 invalid_api_key</code>: missing, wrong or revoked key.</li>
            <li><code className="font-mono">404 not_found</code>: no search with that id on your account.</li>
            <li><code className="font-mono">429 rate_limited</code>: more than 60 searches a minute, or more than 3 running at once. These limits protect the sources from being hammered; they aren’t a paywall.</li>
          </ul>
        </article>
      </div>
    </Page>
  );
}
