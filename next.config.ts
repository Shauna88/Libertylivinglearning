import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep the pg driver external to the server bundle.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
