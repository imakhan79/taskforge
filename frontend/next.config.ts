import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Pins the workspace root to this package explicitly. Without this, Next
  // walks up from cwd looking for a lockfile/git root and can resolve a
  // differently-cased path than the one Node started with on
  // case-insensitive filesystems (Windows), which corrupts webpack's
  // module-identity cache and throws "Expected workStore to be
  // initialized" during static generation.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
