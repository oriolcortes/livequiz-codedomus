import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    reactCompiler: true
  },
  images: {
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
