import { Suspense } from "react";
import type { Metadata } from "next";
import { Page } from "@/components/shell";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AuthPage() {
  return (
    <Page className="flex justify-center">
      <Suspense><AuthForm mode="sign-in" /></Suspense>
    </Page>
  );
}
