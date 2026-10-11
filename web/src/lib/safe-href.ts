/** An absolute http(s) URL, or undefined. Links built from source data go through this, so a
 *  javascript:, data: or relative value from a third-party API never becomes a clickable link. */
export function safeHref(u: unknown): string | undefined {
  if (typeof u !== "string" || !/^https?:\/\//i.test(u.trim())) return undefined;
  try {
    const url = new URL(u.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch { return undefined; }
}
