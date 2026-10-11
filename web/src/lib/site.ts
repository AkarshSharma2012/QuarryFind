// Absolute URLs for metadata files (sitemap, robots, manifest), which Next doesn't base-path.
export const SITE_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const absolute = (path: string) => `${SITE_ORIGIN}${BASE_PATH}${path}`;
