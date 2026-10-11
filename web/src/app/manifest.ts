import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/site";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuarryFind", short_name: "QuarryFind",
    description: "Free OSINT search for usernames, email addresses and domains.",
    start_url: `${BASE_PATH}/`, scope: `${BASE_PATH}/`, display: "standalone",
    background_color: "#0c0d10", theme_color: "#0c0d10",
    icons: [
      { src: `${BASE_PATH}/icon.svg`, sizes: "any", type: "image/svg+xml" },
      { src: `${BASE_PATH}/apple-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  };
}
