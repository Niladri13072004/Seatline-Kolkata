import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist",
  basePath: "/_experiences/seatline-kolkata",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
