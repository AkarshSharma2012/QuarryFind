import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import { contentSecurityPolicy } from "@/lib/csp";
import { PasswordGate } from "@/components/password-gate";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { siteName: "QuarryFind", type: "website" },
  title: { default: "QuarryFind: username, email and domain search", template: "%s · QuarryFind" },
  description: "Search a username, email address or domain across hundreds of public sources and see what each one returns, live.",
};

export const viewport: Viewport = { themeColor: "#0c0d10", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy()} />}
        {/* Every page talks to Supabase soon after load (session, status); open the connection early. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ToastProvider><PasswordGate>{children}</PasswordGate></ToastProvider>
      </body>
    </html>
  );
}
