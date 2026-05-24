import type { Metadata } from "next";
import "./globals.css";

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
  // Search-engine lockdown until Randy approves public launch.
  // See handoff/PROD_PROMOTE.md for the toggle ceremony.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
