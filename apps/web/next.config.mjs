// The repository root .env is handed to Node by the scripts in package.json (--env-file-if-exists), so
// it is in place before Next takes its own snapshot of the environment.

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace packages ship TypeScript source.
  transpilePackages: ["@sangam/core", "@sangam/llm", "@sangam/speech"],
};

export default nextConfig;
