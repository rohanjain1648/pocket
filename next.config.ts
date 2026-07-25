import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
  webpack(config) {
    // Windows dev-server watcher can otherwise pick up its own .next output,
    // the sqlite db files (rewritten on every query), and Playwright MCP's
    // snapshot/log artifacts as "source changes", causing an infinite
    // compile -> write -> recompile loop.
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        "**/node_modules/**",
        "**/.git/**",
        "**/.next/**",
        "**/prisma/dev.db*",
        "**/.playwright-mcp/**",
      ],
    };
    return config;
  },
};

export default nextConfig;
