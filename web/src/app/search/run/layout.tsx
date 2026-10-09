import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search results" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
