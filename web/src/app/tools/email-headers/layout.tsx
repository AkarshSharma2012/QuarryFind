import type { Metadata } from "next";

export const metadata: Metadata = { title: "Email header analyzer" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
