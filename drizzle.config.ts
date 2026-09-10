import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run Drizzle Kit");
}

const connectionString = (() => {
  try {
    const url = new URL(databaseUrl);
    const sslmode = url.searchParams.get("sslmode");

    if (sslmode === "prefer" || sslmode === "require" || sslmode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Keep the original value so Drizzle Kit can surface a useful connection error.
  }

  return databaseUrl;
})();

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url: connectionString,
  },
});
