import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Optional: Konfigurasi image domain kalau perlu
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
