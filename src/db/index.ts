import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and point it at your Postgres database.");
}

const globalForDb = globalThis as typeof globalThis & { __quillPgPool?: Pool };

const connectionString = (() => {
  try {
    const url = new URL(databaseUrl);
    const sslmode = url.searchParams.get("sslmode");
    if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Keep the original value so pg can surface a useful connection error.
  }
  return databaseUrl;
})();

export const pool = globalForDb.__quillPgPool ?? new Pool({ connectionString, max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__quillPgPool = pool;
}

export const db = drizzle(pool);
