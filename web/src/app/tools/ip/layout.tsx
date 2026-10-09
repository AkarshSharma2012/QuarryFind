import type { Metadata } from "next";

export const metadata: Metadata = { title: "IP address lookup" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
