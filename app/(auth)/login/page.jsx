import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata = {
  title: "Sign in — Motion Pod",
  description: "Sign in with Google or LinkedIn to enter Motion Pod Studio.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[360px] w-full max-w-[420px] items-center justify-center rounded-[28px] border border-black/[0.08] dark:border-white/[0.12] bg-white/70 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl">
          <div className="size-6 animate-spin rounded-full border-2 border-[#007AFF] border-t-transparent" />
        </div>
      }
    >
      <AuthCard />
    </Suspense>
  );
}
