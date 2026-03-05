/**
 * Load .env before any other application code. Must be the first import in index.ts
 * so that DATABASE_URL and other vars are set before db.ts or routes are loaded.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

console.log("[server] Booting...");
// CJS bundle has no import.meta.url; use entry script dir (dist/) so path to .env is project root
const __dirname =
  typeof import.meta !== "undefined" && import.meta.url
    ? path.dirname(fileURLToPath(import.meta.url))
    : path.dirname(process.argv[1] || ".");
const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });
