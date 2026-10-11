// Content-Security-Policy for the static build (GitHub Pages can't send headers, so it's a
// <meta> tag). Next inlines its bootstrap scripts, so scripts need 'unsafe-inline'; the gain is
// that the page can only talk to our backend (and the breached-password range API), never
// load scripts or plugins from elsewhere, and can't be retargeted with <base>.
export function contentSecurityPolicy(env: Record<string, string | undefined> = process.env): string {
  const backend = [env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_DEV_API].filter(Boolean) as string[];
  const sockets = backend.map((u) => u.replace(/^http/, "ws"));
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${[...backend, ...sockets, "https://api.pwnedpasswords.com"].join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
  ].join("; ");
}
