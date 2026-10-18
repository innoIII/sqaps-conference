import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // The AI routes read paper text, CV pages and analysis cards from docs/ at
  // runtime (see src/lib/paper-knowledge.ts).
  outputFileTracingIncludes: {
    "/api/ai/agent": ["./docs/cv/**/*.md", "./docs/papers/**/*.md", "./docs/cards/**/*.json"],
    "/api/ai/analyze": ["./docs/cv/**/*.md", "./docs/papers/**/*.md", "./docs/cards/**/*.json"],
  },
};

export default nextConfig;
