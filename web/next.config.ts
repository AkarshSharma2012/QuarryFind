import type { NextConfig } from "next";

// Static export: the whole site is prerendered HTML + client components that
// talk to Supabase. Hosted on GitHub Pages (.github/workflows/pages.yml).
const nextConfig: NextConfig = {
  output: "export",
  // Separate build dir so `next build` never clobbers a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // GitHub Pages serves the site under /<repo>/; set NEXT_PUBLIC_BASE_PATH=/OsintSet there.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
