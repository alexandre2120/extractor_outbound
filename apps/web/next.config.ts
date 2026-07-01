import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: [
    "@repo/ui",
    "@repo/config",
    "@repo/schemas",
    "@repo/db",
    "@repo/integrations",
    "@repo/prompts",
  ],
  serverExternalPackages: ["@prisma/client", ".prisma/client", "playwright", "playwright-core"],
};

export default nextConfig;
