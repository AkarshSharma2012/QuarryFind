import type { MetadataRoute } from "next";
import { absolute } from "@/lib/site";

export const dynamic = "force-static";

// Signed-in areas have nothing to index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/search/run/", "/history/", "/cases/", "/settings/", "/design/"] },
    sitemap: absolute("/sitemap.xml"),
  };
}
