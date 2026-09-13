// Local dev database for Quill — spins up an embedded Postgres cluster.
// Usage: node scripts/dev-db.mjs  (runs until killed; data persists in .pgdata)
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.DEV_DB_PORT ?? 5433);
const DATA_DIR = ".pgdata/dev";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: "quill",
  password: "quill",
  port: PORT,
  persistent: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
});

await pg.initialise();
await pg.start();

const client = pg.getPgClient("postgres");
await client.connect();
const { rows } = await client.query("SELECT 1 FROM pg_database WHERE datname = 'quill'");
if (rows.length === 0) {
  await client.query("CREATE DATABASE quill");
  console.log("[dev-db] created database: quill");
} else {
  console.log("[dev-db] database already exists: quill");
}
await client.end();
console.log(`[dev-db] postgres ready: postgres://quill:quill@127.0.0.1:${PORT}/quill`);

// Keep the process alive; pg_ctl child is terminated when we exit.
process.on("SIGINT", () => { void pg.stop().then(() => process.exit(0)); });
process.on("SIGTERM", () => { void pg.stop().then(() => process.exit(0)); });
setInterval(() => {}, 1 << 30);
