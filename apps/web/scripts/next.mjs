// Starts Next after loading the repository's root .env.
//
// Next resets the environment to its own snapshot whenever it reloads env files for apps/web, which
// wipes variables loaded from the repository root by next.config.mjs. Loading the file here, before Next
// starts, puts the variables in the snapshot. Anything already set in the shell wins over the file.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const envFile = resolve(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

await import("next/dist/bin/next");
