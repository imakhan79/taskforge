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
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
