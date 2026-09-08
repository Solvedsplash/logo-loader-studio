import { Inter } from "next/font/google";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Motion Pod — Animate your logo",
  description:
    "Beautiful logo loading animations, crafted in seconds. Export as WebM, GIF, or Lottie.",
  icons: { icon: "/MotionPod.svg" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function LandingLayout({ children }) {
  return (
    <div className={inter.variable} style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {children}
    </div>
  );
}
