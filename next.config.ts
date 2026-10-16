import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SAFECHECK_TEST_DIST_DIR ?? ".next",
  ...(process.env.NODE_ENV === "production"
    ? { output: "export" as const }
    : {}),
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
