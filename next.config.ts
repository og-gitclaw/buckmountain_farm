import type { NextConfig } from "next";

const config: NextConfig = {
  // Preview-only deployments per project policy — no prod promotes without explicit OK.
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cbd.restaurant" },
      { protocol: "https", hostname: "www.buckmountaincannabis.com" },
      { protocol: "https", hostname: "buckmountaincannabis.com" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default config;
