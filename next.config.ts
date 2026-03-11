import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  // Skip type checking during Docker build (CI handles this separately)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
