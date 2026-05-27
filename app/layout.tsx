import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { AgeGate } from "@/components/age-gate";
import { GrainOverlay } from "@/components/grain-overlay";

export const metadata: Metadata = {
  title: "Buck Mountain Cannabis — Sierra Foothills",
  description:
    "Legacy cannabis brand in the Sierra foothills of Nevada County, California. Hybrid environments, hand-pulled light deps, outdoor hoop dreams. Flower, rosin, extracts, trim, smalls.",
  metadataBase: new URL("https://buckmountain.farm"),
  openGraph: {
    title: "Buck Mountain Cannabis",
    description:
      "Sierra foothills cannabis. Hybrid environments, hand-pulled light deps, outdoor hoop dreams.",
    url: "https://buckmountain.farm",
    siteName: "Buck Mountain Cannabis",
    type: "website",
  },
  icons: { icon: "/brand/logo.svg" },
  // Search-engine lockdown until Randy approves public launch.
  // See handoff/PROD_PROMOTE.md for the toggle ceremony.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* Page-wide film grain — extremely subtle (6% opacity). Sits
            above content via z-[1] but pointer-events:none so it never
            blocks clicks. Animated 0.8s noise shift for that lived-in feel. */}
        <GrainOverlay opacity={0.06} blendMode="overlay" />
        <SiteNav />
        {children}
        <AgeGate />
      </body>
    </html>
  );
}
