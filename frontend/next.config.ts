import type { NextConfig } from "next";

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  reactStrictMode: true,

  // Enable Turbopack
  experimental: {
    // turbo: {},
  },

  allowedDevOrigins: [
    "api.qstack.com.ng",
    "dev.qstack.com.ng",
    "testing.qstack.com.ng",
  ],
};

export default config;
