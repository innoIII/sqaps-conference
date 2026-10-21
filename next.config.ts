import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // The AI routes read paper text, CV pages and analysis cards from docs/ at
  // runtime (see src/lib/paper-knowledge.ts).
  outputFileTracingIncludes: {
    "/api/ai/agent": ["./docs/cv/**/*.md", "./docs/papers/**/*.md", "./docs/cards/**/*.json"],
    "/api/ai/analyze": ["./docs/cv/**/*.md", "./docs/papers/**/*.md", "./docs/cards/**/*.json"],
  },
  // Prisma traces every engine variant it ships (WASM builds for 5 databases,
  // edge/binary runtimes, source maps) into each function — ~55 MB per route,
  // multiplied by every kept deployment in Vercel's "Functions Storage".
  // We only use the Node-API library engine (runtime/library.js + the native
  // libquery_engine for the deploy platform), so drop the rest.
  outputFileTracingExcludes: {
    "/**/*": [
      "./node_modules/@prisma/client/runtime/*.wasm-base64.*",
      "./node_modules/@prisma/client/runtime/*.map",
      "./node_modules/@prisma/client/runtime/binary.*",
      "./node_modules/@prisma/client/runtime/edge*",
      "./node_modules/@prisma/client/runtime/wasm-*",
      "./node_modules/@prisma/client/runtime/react-native.*",
      "./node_modules/.prisma/client/query_engine_bg.*",
      "./node_modules/.prisma/client/wasm*",
      "./node_modules/@prisma/engines/**",
      "./node_modules/prisma/**",
    ],
  },
};

export default nextConfig;
