import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The payroll UI used to live under "salary-streams".
    return [{ source: "/dashboard/salary-streams", destination: "/dashboard/payroll", permanent: true }];
  },
  // Explicit root: Turbopack otherwise infers it from the nearest lockfile,
  // which can be a stray lockfile in a parent directory on a developer machine.
  turbopack: { root: process.cwd() },
  experimental: {
    turbopackFileSystemCacheForDev: false,
  },
};

export default nextConfig;
