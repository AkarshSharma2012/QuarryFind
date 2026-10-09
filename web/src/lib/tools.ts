export interface ToolDef {
  slug: string;
  title: string;
  blurb: string;
  group: "People" | "Domains & infrastructure" | "Files & text";
  input?: { label: string; placeholder: string; prefix?: string };
  server?: boolean;   // runs through the tools API
  account?: boolean;  // needs a (free) account
}

export const TOOLS: ToolDef[] = [
  { slug: "github", title: "GitHub profile", blurb: "Repositories, languages, the names and emails in public commits, and when the account is active.", group: "People", input: { label: "GitHub username", placeholder: "handle", prefix: "@" }, server: true, account: true },
  { slug: "reddit", title: "Reddit profile", blurb: "Karma, account age, most active communities and recent public activity.", group: "People", input: { label: "Reddit username", placeholder: "username", prefix: "u/" }, server: true, account: true },
  { slug: "variations", title: "Username variations", blurb: "Common spellings and separators of a name or handle, ready to search.", group: "People" },
  { slug: "dorks", title: "Search dork builder", blurb: "Precise search-engine queries for a person, handle, email or site.", group: "People" },
  { slug: "phone", title: "Phone number parser", blurb: "Country, region, line type and standard formats for a number. Offline, nothing is sent.", group: "People" },
  { slug: "ip", title: "IP address lookup", blurb: "Reverse DNS, network owner, ASN, prefix and registry for an IP.", group: "Domains & infrastructure", input: { label: "IP address", placeholder: "203.0.113.7" }, server: true },
  { slug: "dns", title: "DNS records", blurb: "A, AAAA, CNAME, MX, NS, TXT, CAA and SOA records.", group: "Domains & infrastructure", input: { label: "Domain", placeholder: "example.com" }, server: true },
  { slug: "whois", title: "WHOIS (RDAP)", blurb: "Registrar, dates, status and nameservers from the registry.", group: "Domains & infrastructure", input: { label: "Domain", placeholder: "example.com" }, server: true },
  { slug: "subdomains", title: "Subdomain finder", blurb: "Hostnames seen in public certificate transparency logs.", group: "Domains & infrastructure", input: { label: "Domain", placeholder: "example.com" }, server: true },
  { slug: "mail", title: "Email security check", blurb: "SPF, DMARC and MX for a domain, and whether its mail is easy to spoof.", group: "Domains & infrastructure", input: { label: "Domain", placeholder: "example.com" }, server: true },
  { slug: "wayback", title: "Archive history", blurb: "First and latest Wayback Machine captures of a site or page.", group: "Domains & infrastructure", input: { label: "Domain or URL", placeholder: "example.com/about" }, server: true },
  { slug: "headers", title: "Website headers & tech", blurb: "Server, CDN, security headers and the technology a site is built with.", group: "Domains & infrastructure", input: { label: "Website", placeholder: "example.com" }, server: true },
  { slug: "exif", title: "Photo metadata", blurb: "Camera, date, software and GPS location in a photo. Read in your browser, never uploaded.", group: "Files & text" },
  { slug: "email-headers", title: "Email header analyzer", blurb: "Paste raw headers to trace the hops and read SPF, DKIM and DMARC results.", group: "Files & text" },
  { slug: "hash", title: "Hashes & breached passwords", blurb: "Identify a hash, hash some text, or check a password against known breaches without sending it.", group: "Files & text" },
];

export const toolBySlug = (s: string) => TOOLS.find((t) => t.slug === s);
