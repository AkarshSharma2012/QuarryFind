import type { NextConfig } from "next";

// Static export: the whole site is prerendered HTML + client components that
// talk to Supabase. Hosted on Cloudflare Pages (free, commercial use allowed).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
