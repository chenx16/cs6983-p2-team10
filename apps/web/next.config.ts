import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@forecasthub/shared"],
};

export default nextConfig;
