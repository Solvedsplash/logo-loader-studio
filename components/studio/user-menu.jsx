"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, User, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="size-7 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
    );
  }

  if (!session?.user) {
    return (
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-7 rounded-full bg-[#007AFF] px-3 text-xs font-medium text-white hover:bg-[#0071E3] hover:text-white"
      >
        <Link href="/login">Sign In</Link>
      </Button>
    );
  }

  const name = session.user.name || "Motion Creator";
  const email = session.user.email || "creator@motionpod.design";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="group relative flex size-7 items-center justify-center rounded-full border border-black/10 dark:border-white/15 bg-gradient-to-tr from-[#007AFF] to-[#5856D6] text-xs font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50"
          aria-label="User Account Menu"
        >
          <span>{initials}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 backdrop-blur-xl">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-semibold leading-none text-foreground">
              {name}
            </p>
            <p className="truncate text-2xs text-muted-foreground">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-2xs text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="size-3 text-[#007AFF]" />
          <span>Motion Pod Studio • Active</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="cursor-pointer text-destructive focus:text-destructive gap-2 text-xs"
        >
          <LogOut className="size-3.5" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
