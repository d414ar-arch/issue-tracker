import { betterAuth } from "better-auth";
import { apiKey } from "@better-auth/api-key";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const baseURL = process.env.AUTH_BASE_URL || "http://localhost:3000/api/auth";

const trustedOrigins = process.env.TRUSTED_ORIGINS
  ? process.env.TRUSTED_ORIGINS.split(",").map((s) => s.trim())
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

const getDatabaseConfig = async () => {
  if (process.env.DATABASE_URL) {
    console.log("BetterAuth using PostgreSQL");
    return new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  const { default: Database } = await import("better-sqlite3");
  const dbPath = path.resolve(__dirname, "..", "database.sqlite");
  console.log("BetterAuth using SQLite at:", dbPath);
  return new Database(dbPath);
};

const authInstance = await betterAuth({
  database: await getDatabaseConfig(),
  baseURL,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins,
  plugins: [
    apiKey({
      defaultPrefix: "issues_",
      enableMetadata: true,
    }),
  ],
});

export const auth = {
  handler: authInstance.handler,
  api: authInstance.api,
};
