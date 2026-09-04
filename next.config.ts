import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel packages the traced output itself; standalone is for the Docker image.
  output: process.env.VERCEL ? undefined : "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    staleTimes: {
      dynamic: 30,
    },
  },
  serverExternalPackages: ["pg"],
};

export default nextConfig;
