"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck, ArrowRight } from "lucide-react";

export function AuthCard() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/studio";
  const urlError = searchParams.get("error");

  const [oauthLoading, setOauthLoading] = useState(null); // "google" | "linkedin" | null
  const [error, setError] = useState(
    urlError === "OAuthCallbackError" || urlError === "Callback"
      ? "Authentication callback failed. Please check your OAuth credentials."
      : urlError
      ? `Authentication error: ${urlError}`
      : ""
  );

  const handleOAuthSignIn = async (provider) => {
    setOauthLoading(provider);
    setError("");

    try {
      // Direct NextAuth OAuth sign-in redirect
      await signIn(provider, { callbackUrl });
    } catch (err) {
      console.error(`${provider} OAuth error:`, err);
      setError(err?.message || "Failed to initiate sign-in. Please try again.");
      setOauthLoading(null);
    }
  };

  return (
    <div className="w-full max-w-[420px] transition-all duration-300">
      {/* Apple-style Outer Frosted Card */}
      <div className="relative rounded-[28px] border border-black/[0.08] dark:border-white/[0.12] bg-white/80 dark:bg-[#1c1c1e]/85 p-8 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.55),0_1px_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        {/* Subtle Specular Top Highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[28px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent" />

        {/* Brand Icon Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-5 flex size-14 items-center justify-center rounded-[18px] bg-gradient-to-b from-white to-[#f0f0f4] dark:from-[#2c2c2e] dark:to-[#1c1c1e] p-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.08),inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[0_4px_18px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] border border-black/5 dark:border-white/10">
            <img
              src="/MotionPod.svg"
              alt="Motion Pod"
              className="size-9 object-contain drop-shadow-[0_2px_8px_rgba(0,122,255,0.3)] transition-transform duration-300 hover:scale-105"
            />
          </div>

          <h1 className="text-[23px] font-semibold tracking-[-0.015em] text-foreground sm:text-[26px]">
            Sign in to Motion Pod
          </h1>
          <p className="mt-2 text-xs text-muted-foreground sm:text-[13px] leading-relaxed max-w-[300px]">
            Log in to access your parametric presets, logo animations, and studio exports.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-3.5 py-2.5 text-xs font-medium text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-7 space-y-3">
          {/* Continue with Google */}
          <button
            type="button"
            disabled={!!oauthLoading}
            onClick={() => handleOAuthSignIn("google")}
            className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 dark:border-white/12 bg-white dark:bg-white/[0.06] text-sm font-semibold text-foreground hover:bg-neutral-50 dark:hover:bg-white/[0.1] hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 active:scale-[0.98] shadow-sm disabled:opacity-60"
          >
            {oauthLoading === "google" ? (
              <Loader2 className="size-4 animate-spin text-[#007AFF]" />
            ) : (
              <svg className="size-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
            <ArrowRight className="absolute right-4 size-4 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
          </button>

          {/* Continue with LinkedIn */}
          <button
            type="button"
            disabled={!!oauthLoading}
            onClick={() => handleOAuthSignIn("linkedin")}
            className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-black/10 dark:border-white/12 bg-white dark:bg-white/[0.06] text-sm font-semibold text-foreground hover:bg-neutral-50 dark:hover:bg-white/[0.1] hover:border-black/20 dark:hover:border-white/20 transition-all duration-200 active:scale-[0.98] shadow-sm disabled:opacity-60"
          >
            {oauthLoading === "linkedin" ? (
              <Loader2 className="size-4 animate-spin text-[#007AFF]" />
            ) : (
              <svg className="size-5 fill-[#0A66C2]" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
            )}
            <span>Continue with LinkedIn</span>
            <ArrowRight className="absolute right-4 size-4 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200" />
          </button>
        </div>

        {/* Apple Privacy Badge */}
        <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] p-3.5 border border-black/[0.04] dark:border-white/[0.06]">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#007AFF]" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Motion Pod connects securely via standard OAuth 2.0. We never store your credentials or share your animations.
          </p>
        </div>

        {/* Terms Notice */}
        <p className="mt-4 text-center text-2xs text-muted-foreground/80 leading-relaxed">
          By signing in, you agree to our{" "}
          <span className="text-foreground/80 hover:underline cursor-pointer">Terms of Service</span> and{" "}
          <span className="text-foreground/80 hover:underline cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
