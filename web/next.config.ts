import type { NextConfig } from "next";

// Static export: the whole site is prerendered HTML + client components that
// talk to Supabase. Hosted on Cloudflare Pages (free, commercial use allowed).
const nextConfig: NextConfig = {
  output: "export",
  // Separate build dir so `next build` never clobbers a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
