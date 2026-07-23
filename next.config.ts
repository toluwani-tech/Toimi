import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Prisma client is generated to a custom, non-node_modules path
  // (src/generated/prisma). Next.js's automatic serverless file tracing doesn't
  // reliably follow Prisma's internal dynamic requires from a custom output
  // location, which can produce a build that succeeds locally but throws
  // "Cannot find module" for the generated client at runtime on Lambda-based
  // hosts (e.g. AWS Amplify). Forcing inclusion here is the documented fix.
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
