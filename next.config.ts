import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
