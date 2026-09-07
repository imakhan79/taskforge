#!/usr/bin/env node
// Re-execs the given command with cwd normalized to the filesystem's true
// on-disk casing. On case-insensitive filesystems (Windows), an invoking
// shell's cwd can differ in case from the real NTFS-preserved directory name
// (e.g. Git Bash reporting "taskforge" for a folder actually named
// "Taskforge"). Next.js mixes process.cwd()-derived paths with
// realpath-resolved ones (e.g. via Node's module resolution), and that
// casing mismatch corrupts webpack/Turbopack's module-identity cache,
// throwing "Expected workStore to be initialized" during static generation.
// Normalizing cwd up front avoids the mismatch everywhere in the build.
import { realpathSync } from "node:fs";
import { spawn } from "node:child_process";

const realCwd = realpathSync.native(process.cwd());
const [, , ...args] = process.argv;

// Args here are always the fixed, hardcoded command from this repo's own
// package.json scripts (never user input), so string concatenation for the
// Windows shell form is safe.
const child =
  process.platform === "win32"
    ? spawn(["npx", ...args].join(" "), { cwd: realCwd, stdio: "inherit", shell: true })
    : spawn("npx", args, { cwd: realCwd, stdio: "inherit" });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
