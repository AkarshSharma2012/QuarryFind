import type { MetadataRoute } from "next";
import { TOOLS } from "@/lib/tools";
import { absolute } from "@/lib/site";

export const dynamic = "force-static";

const PAGES = ["/", "/tools/", "/sources/", "/how-it-works/", "/docs/", "/docs/api/", "/about/", "/privacy/", "/terms/", "/sign-up/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...PAGES, ...TOOLS.map((t) => `/tools/${t.slug}/`)].map((p) => ({
    url: absolute(p), changeFrequency: p === "/sources/" ? "daily" : "monthly", priority: p === "/" ? 1 : p.startsWith("/tools/") ? 0.7 : 0.5,
  }));
}
