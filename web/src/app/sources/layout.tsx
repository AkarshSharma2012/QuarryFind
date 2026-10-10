import type { Metadata } from "next";

export const metadata: Metadata = { title: "Source status", description: "Live status of every source, tested daily against a real account and a made-up one." };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
