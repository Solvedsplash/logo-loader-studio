import Link from "next/link";
import { ThemeToggle } from "@/components/auth/theme-toggle";

export const metadata = {
  title: "Sign in — Motion Pod",
  description: "Sign in or create your Motion Pod ID to start designing parametric logo loading animations.",
};

export default function AuthLayout({ children }) {
  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#f5f5f7] dark:bg-[#000000] text-foreground antialiased selection:bg-[#007AFF] selection:text-white transition-colors duration-300">
      {/* Dynamic Ambient Background: subtle Apple-like diffused glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-[#007AFF]/15 via-[#5856D6]/8 to-transparent blur-[120px] dark:from-[#007AFF]/12 dark:via-[#5856D6]/6" />
        <div className="absolute -bottom-[20%] right-[-10%] h-[500px] w-[600px] rounded-full bg-gradient-to-tl from-[#007AFF]/10 to-transparent blur-[100px] dark:from-[#007AFF]/8" />
        <div className="absolute -bottom-[15%] left-[-10%] h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#34C759]/8 to-transparent blur-[100px] dark:from-[#34C759]/5" />
      </div>

      {/* Top Apple-style Minimal Navigation Header */}
      <header className="relative z-20 flex h-14 items-center justify-between px-5 sm:px-8 border-b border-black/[0.04] dark:border-white/[0.06] backdrop-blur-md bg-white/40 dark:bg-black/40">
        <Link
          href="/"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <img
            src="/MotionPod.svg"
            alt="Motion Pod"
            className="size-6 object-contain"
          />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Motion Pod
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        {children}
      </main>

      {/* Apple-style Legal & System Footer */}
      <footer className="relative z-20 border-t border-black/[0.04] dark:border-white/[0.06] px-4 py-5 text-center text-2xs text-muted-foreground">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-2.5 sm:flex-row">
          <p>
            Copyright © {new Date().getFullYear()} Motion Pod Studio. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Terms of Use
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Sales and Refunds
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Legal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
