import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // The AI routes read researcher CV text from docs/cv/*.md at runtime.
  outputFileTracingIncludes: {
    "/api/ai/agent": ["./docs/cv/**/*.md"],
    "/api/ai/generate-report": ["./docs/cv/**/*.md"],
  },
};

export default nextConfig;
