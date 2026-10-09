// Pure helpers for the in-browser tools (unit-tested in tests/client-tools.test.ts).

/** Username variations from a name or handle. */
export function variations(input: string, max = 60): string[] {
  const words = input.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  const out = new Set<string>();
  const seps = ["", ".", "_", "-"];
  const add = (s: string) => { if (/^[a-z0-9._-]{2,40}$/.test(s)) out.add(s); };
  if (words.length === 1) {
    const w = words[0];
    [w, `${w}_`, `_${w}`, `${w}1`, `${w}01`, `the${w}`, `${w}official`, `real${w}`, `${w}x`, `x${w}`, `its${w}`, `i${w}`, `${w}hq`, `${w}dev`].forEach(add);
    const leet = w.replace(/a/g, "4").replace(/e/g, "3").replace(/i/g, "1").replace(/o/g, "0");
    add(leet);
  } else {
    const [f, ...rest] = words;
    const l = rest[rest.length - 1];
    for (const s of seps) {
      add(`${f}${s}${l}`); add(`${l}${s}${f}`); add(`${f[0]}${s}${l}`); add(`${f}${s}${l[0]}`); add(`${l}${s}${f[0]}`);
      add(words.join(s));
    }
    add(`${f[0]}${l[0]}`); add(`${f}${l}1`); add(`${f}${l}01`); add(`the${f}${l}`); add(`${f}${l}official`); add(`real${f}${l}`);
  }
  return [...out].slice(0, max);
}

export interface Dork { label: string; query: string }

export function dorks(kind: "person" | "username" | "email" | "domain", raw: string): Dork[] {
  const q = raw.trim().replace(/"/g, "");
  if (!q) return [];
  const Q = `"${q}"`;
  switch (kind) {
    case "person": return [
      { label: "Exact name", query: Q },
      { label: "Social profiles", query: `${Q} (site:linkedin.com/in OR site:x.com OR site:instagram.com OR site:facebook.com)` },
      { label: "Documents", query: `${Q} (filetype:pdf OR filetype:docx OR filetype:xlsx OR filetype:pptx)` },
      { label: "CV or résumé", query: `${Q} (cv OR resume OR "curriculum vitae")` },
      { label: "News and mentions", query: `${Q} -site:linkedin.com -site:facebook.com` },
    ];
    case "username": return [
      { label: "Exact handle", query: Q },
      { label: "Handle with @", query: `"@${q}"` },
      { label: "Code and pastes", query: `${Q} (site:github.com OR site:gitlab.com OR site:pastebin.com OR site:gist.github.com)` },
      { label: "Forums", query: `${Q} (inurl:forum OR inurl:thread OR inurl:member OR inurl:profile)` },
      { label: "Social", query: `${Q} (site:reddit.com OR site:x.com OR site:youtube.com OR site:tiktok.com)` },
    ];
    case "email": {
      const [local, dom] = q.split("@");
      return [
        { label: "Exact email", query: Q },
        { label: "In documents", query: `${Q} (filetype:pdf OR filetype:xls OR filetype:xlsx OR filetype:csv OR filetype:txt)` },
        { label: "In code and pastes", query: `${Q} (site:github.com OR site:pastebin.com)` },
        ...(local ? [{ label: "Local part as handle", query: `"${local}" -"${q}"` }] : []),
        ...(dom ? [{ label: "Other addresses at the domain", query: `"@${dom}" -"${q}"` }] : []),
      ];
    }
    case "domain": return [
      { label: "Indexed pages", query: `site:${q}` },
      { label: "Subdomains", query: `site:*.${q} -site:www.${q}` },
      { label: "Exposed files", query: `site:${q} (filetype:pdf OR filetype:doc OR filetype:xls OR filetype:txt OR filetype:log OR filetype:sql OR filetype:env)` },
      { label: "Login and admin pages", query: `site:${q} (inurl:login OR inurl:admin OR inurl:signin OR intitle:dashboard)` },
      { label: "Directory listings", query: `site:${q} intitle:"index of"` },
      { label: "Mentions elsewhere", query: `"${q}" -site:${q}` },
    ];
  }
}

export const ENGINES = [
  { name: "Google", url: (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  { name: "Bing", url: (q: string) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  { name: "DuckDuckGo", url: (q: string) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
];

/** Guess what algorithm produced a hex/base64 hash. */
export function identifyHash(h: string): string[] {
  const s = h.trim();
  if (/^\$2[aby]\$\d{2}\$/.test(s)) return ["bcrypt"];
  if (/^\$argon2(id|i|d)\$/.test(s)) return ["Argon2"];
  if (/^\$6\$/.test(s)) return ["SHA-512 crypt (Linux shadow)"];
  if (/^\$5\$/.test(s)) return ["SHA-256 crypt"];
  if (/^\$1\$/.test(s)) return ["MD5 crypt"];
  if (/^\$P\$|^\$H\$/.test(s)) return ["phpass (WordPress, phpBB)"];
  if (/^pbkdf2_sha256\$/.test(s)) return ["Django PBKDF2-SHA256"];
  if (!/^[a-f0-9]+$/i.test(s)) return [];
  const byLen: Record<number, string[]> = {
    8: ["CRC32", "Adler-32"], 16: ["MySQL 3.x", "half MD5"], 32: ["MD5", "NTLM", "MD4"], 40: ["SHA-1", "RIPEMD-160", "MySQL 5 (without *)"],
    56: ["SHA-224", "SHA3-224"], 64: ["SHA-256", "SHA3-256", "BLAKE2s"], 96: ["SHA-384", "SHA3-384"], 128: ["SHA-512", "SHA3-512", "BLAKE2b", "Whirlpool"],
  };
  return byLen[s.length] ?? [];
}

export async function digest(algo: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512", text: string) {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** k-anonymity: only the first 5 hex chars of the SHA-1 leave the browser. */
export async function pwnedCount(password: string): Promise<number> {
  const sha = (await digest("SHA-1", password)).toUpperCase();
  const res = await fetch(`https://api.pwnedpasswords.com/range/${sha.slice(0, 5)}`, { headers: { "Add-Padding": "true" } });
  if (!res.ok) throw new Error(`The breach service answered ${res.status}.`);
  const text = await res.text();
  for (const line of text.split("\n")) {
    const [suffix, count] = line.trim().split(":");
    if (suffix === sha.slice(5)) return Number(count);
  }
  return 0;
}

export interface Hop { from?: string; by?: string; with?: string; date?: string; delay?: number }
export interface HeaderReport {
  subject?: string; from?: string; to?: string; replyTo?: string; returnPath?: string; messageId?: string; date?: string;
  auth: { name: string; value: string }[]; hops: Hop[]; ips: string[]; warnings: string[];
}

/** Parse raw RFC 5322 headers: unfold, then read routing and authentication. */
export function analyzeHeaders(raw: string): HeaderReport {
  const unfolded = raw.replace(/\r\n/g, "\n").split(/\n\n/)[0].replace(/\n[ \t]+/g, " ");
  const lines = unfolded.split("\n").filter((l) => /^[\w-]+:/.test(l));
  const all = (n: string) => lines.filter((l) => l.toLowerCase().startsWith(n.toLowerCase() + ":")).map((l) => l.slice(n.length + 1).trim());
  const one = (n: string) => all(n)[0];
  const hops: Hop[] = all("Received").reverse().map((r) => {
    const date = r.split(";").pop()?.trim();
    return {
      from: r.match(/from\s+([^\s;]+(?:\s+\([^)]*\))?)/i)?.[1],
      by: r.match(/by\s+([^\s;]+)/i)?.[1],
      with: r.match(/with\s+([^\s;]+)/i)?.[1],
      date,
    };
  });
  let prev: number | undefined;
  for (const h of hops) {
    const t = h.date ? Date.parse(h.date) : NaN;
    if (!Number.isNaN(t)) { if (prev !== undefined) h.delay = Math.round((t - prev) / 1000); prev = t; }
  }
  const authRes = [...all("Authentication-Results"), ...all("ARC-Authentication-Results")].join("; ");
  const auth: { name: string; value: string }[] = [];
  for (const k of ["spf", "dkim", "dmarc", "arc"]) {
    const m = authRes.match(new RegExp(`\\b${k}=(\\w+)`, "i"));
    if (m) auth.push({ name: k.toUpperCase(), value: m[1].toLowerCase() });
  }
  const ips = [...new Set((all("Received").join(" ").match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) ?? []).filter((ip) => !/^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)))];
  const from = one("From"), replyTo = one("Reply-To"), returnPath = one("Return-Path");
  const dom = (s?: string) => s?.match(/@([\w.-]+)/)?.[1]?.toLowerCase();
  const warnings: string[] = [];
  if (replyTo && dom(replyTo) !== dom(from)) warnings.push("Reply-To goes to a different domain than From.");
  if (returnPath && dom(returnPath) && dom(returnPath) !== dom(from)) warnings.push("Return-Path (bounce address) domain differs from From. Common for mailing services, but check it.");
  for (const a of auth) if (["fail", "softfail", "none", "permerror"].includes(a.value)) warnings.push(`${a.name} result is “${a.value}”.`);
  return { subject: one("Subject"), from, to: one("To"), replyTo, returnPath, messageId: one("Message-ID"), date: one("Date"), auth, hops, ips, warnings };
}
