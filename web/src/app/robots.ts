import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// A private site: nothing to index.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
