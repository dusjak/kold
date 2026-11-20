import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loggmappen leses på denne maskinen ved hver forespørsel.
  // cacheComponents er derfor ikke slått på.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
