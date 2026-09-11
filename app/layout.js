import { Cabin, Geist_Mono } from "next/font/google";
import { ThemeScript } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import "./globals.css";

const cabin = Cabin({
  variable: "--font-cabin",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Motion Pod",
  description:
    "Design logo loading animations from a library of parametric presets, then export them as transparent WebM, GIF or Lottie.",
  icons: {
    icon: "/MotionPod.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint across all routes. */}
        <ThemeScript />
      </head>
      <body className={`${cabin.variable} ${geistMono.variable}`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}

