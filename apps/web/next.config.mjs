import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";

// Read the repository's root .env (one file for every package), not just apps/web.
nextEnv.loadEnvConfig(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source.
  transpilePackages: ["@sangam/core", "@sangam/llm"],
};

export default nextConfig;
