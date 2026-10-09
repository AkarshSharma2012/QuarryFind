// IP lookup: reverse DNS, ASN via Team Cymru's DNS service, and RDAP owner.
import { getJson, inconclusive } from "./http.ts";
import { dohQuery, reverseName, unquote } from "./dns.ts";
import type { CheckResult, Ctx } from "./types.ts";

type J = Record<string, any>; // deno-lint-ignore no-explicit-any

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

export function isIp(s: string) {
  return IPV4.test(s) || (s.includes(":") && IPV6.test(s));
}

function isPrivate(ip: string) {
  return /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1$|fc|fd|fe80)/i.test(ip);
}

export async function ipLookup(ctx: Ctx, ip: string): Promise<CheckResult> {
  if (!isIp(ip)) return { outcome: "error", detail: "not an IP address" };
  if (isPrivate(ip)) return { outcome: "absent", detail: "private or reserved address" };
  const rev = reverseName(ip);
  const [ptr, asnTxt, rdap] = await Promise.all([
    rev ? dohQuery(ctx, rev, "PTR") : Promise.resolve([]),
    rev ? dohQuery(ctx, rev.replace(".in-addr.arpa", ".origin.asn.cymru.com"), "TXT") : Promise.resolve([]),
    getJson<J>(ctx, `https://rdap.org/ip/${encodeURIComponent(ip)}`, { headers: { accept: "application/rdap+json" } }).catch(() => null),
  ]);
  const records: { name: string; value: string }[] = [];
  for (const p of ptr ?? []) records.push({ name: "Reverse DNS", value: p.data.replace(/\.$/, "") });
  const cym = asnTxt?.[0] ? unquote(asnTxt[0].data).split("|").map((s) => s.trim()) : null;
  if (cym) {
    const [asn, prefix, cc, registry, allocated] = cym;
    const asName = await dohQuery(ctx, `AS${asn.split(" ")[0]}.asn.cymru.com`, "TXT");
    const name = asName?.[0] ? unquote(asName[0].data).split("|").pop()?.trim() : undefined;
    records.push({ name: "ASN", value: `AS${asn}${name ? ` ${name}` : ""}` }, { name: "Prefix", value: prefix }, { name: "Country", value: cc }, { name: "Registry", value: registry.toUpperCase() }, { name: "Allocated", value: allocated });
  }
  const d = rdap?.status === 200 ? rdap.data : null;
  if (d) {
    if (d.name) records.push({ name: "Network name", value: d.name });
    if (d.startAddress) records.push({ name: "Range", value: `${d.startAddress} – ${d.endAddress}` });
    const org = (d.entities ?? []).map((e: J) => e.vcardArray?.[1]?.find((v: J[]) => v[0] === "fn")?.[3]).filter(Boolean)[0];
    if (org) records.push({ name: "Owner", value: org });
  }
  if (!records.length) return inconclusive("no data from DNS or RDAP");
  return { outcome: "hit", findings: [{ type: "record", platform: "IP address", category: "dns", value: ip, confidence: 1, metadata: { records, url: `https://client.rdap.org/?type=ip&object=${ip}` } }] };
}
