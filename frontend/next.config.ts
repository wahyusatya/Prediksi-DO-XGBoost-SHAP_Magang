import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.24.191",
    "localhost:3000",
  ],
};

export default nextConfig;
