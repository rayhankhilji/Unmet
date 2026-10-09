import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@unmet/shared", "@unmet/db"],
  typedRoutes: true,
};

export default nextConfig;
