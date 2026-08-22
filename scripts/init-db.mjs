import { createClient } from "@tursodatabase/serverless/compat";

const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  process.exit(1);
}

const db = createClient({ url, authToken });
await db.execute(`
  CREATE TABLE IF NOT EXISTS shared_documents (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
    markdown TEXT NOT NULL CHECK(length(markdown) > 0),
    created_at TEXT NOT NULL
  ) STRICT
`);
await db.execute(`
  CREATE INDEX IF NOT EXISTS idx_shared_documents_created_at
  ON shared_documents(created_at DESC)
`);
const result = await db.execute(`
  SELECT name FROM sqlite_schema
  WHERE type = 'table' AND name = 'shared_documents'
`);
if (result.rows.length !== 1) throw new Error("Table verification failed.");
console.log("Turso table ready: shared_documents");
