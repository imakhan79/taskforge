import fs from "node:fs";
import type { NextConfig } from "next";

// Resolve against the filesystem's true on-disk casing rather than
// __dirname's casing. __dirname inherits whatever case the invoking shell's
// cwd happened to use (e.g. Git Bash lowercases "Taskforge" to "taskforge"),
// which can differ from the real NTFS-preserved name. On case-insensitive
// filesystems (Windows) that mismatch corrupts webpack/Turbopack's
// module-identity cache and throws "Expected workStore to be initialized"
// during static generation.
const projectRoot = fs.realpathSync.native(__dirname);

const nextConfig: NextConfig = {
  // "standalone" produces the self-contained server bundle the Dockerfile
  // copies into its runner stage (see Dockerfile: COPY .next/standalone).
  // Vercel's own builder expects the regular traced .next output to build
  // its serverless functions from, and fails the build when "standalone" is
  // set, so only apply it outside Vercel's build environment.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
