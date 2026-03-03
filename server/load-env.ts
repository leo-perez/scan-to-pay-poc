/**
 * Load .env before any other application code. Must be the first import in index.ts
 * so that DATABASE_URL and other vars are set before db.ts or routes are loaded.
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

console.log("[server] Booting...");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");
dotenv.config({ path: envPath });
