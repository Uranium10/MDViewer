import { createClient } from "@tursodatabase/serverless/compat";

const { TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken } = process.env;
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required.");
  process.exit(1);
}

const db = createClient({ url, authToken });
const createTable = `
  CREATE TABLE shared_documents (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(id) = 16),
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    encryption_version INTEGER NOT NULL CHECK(encryption_version = 2),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    CHECK(length(ciphertext) > 0),
    CHECK(length(iv) > 0)
  ) STRICT
`;

const tableResult = await db.execute(`
  SELECT name, sql FROM sqlite_schema
  WHERE type = 'table' AND name = 'shared_documents'
`);

if (process.argv.includes("--dry-run")) {
  if (tableResult.rows.length === 0) {
    console.log(JSON.stringify({ table: false, count: 0, columns: [] }));
  } else {
    const columns = await db.execute("PRAGMA table_info(shared_documents)");
    const count = await db.execute("SELECT count(*) AS count FROM shared_documents");
    const names = columns.rows.map(row => row.name);
    const versions = names.includes("encryption_version") ? await db.execute("SELECT encryption_version AS version, count(*) AS count FROM shared_documents GROUP BY encryption_version ORDER BY encryption_version") : null;
    const active = names.includes("expires_at") ? await db.execute("SELECT count(*) AS count FROM shared_documents WHERE expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')") : null;
    console.log(JSON.stringify({
      table: true,
      count: Number(count.rows[0]?.count ?? 0),
      columns: names,
      active: active ? Number(active.rows[0]?.count ?? 0) : null,
      versions: versions ? versions.rows.map(row => ({ version: Number(row.version), count: Number(row.count) })) : [],
    }));
  }
  db.close();
  process.exit(0);
}

if (tableResult.rows.length === 0) {
  await db.execute(createTable);
} else {
  const columns = await db.execute("PRAGMA table_info(shared_documents)");
  const names = new Set(columns.rows.map(row => row.name));
  const tableSql = tableResult.rows[0]?.sql;
  const encryptedColumns = ["ciphertext", "iv", "encryption_version", "created_at", "expires_at"].every(name => names.has(name));
  const isV2Schema = encryptedColumns && !names.has("markdown") && typeof tableSql === "string" &&
    /CHECK\s*\(\s*encryption_version\s*=\s*2\s*\)/i.test(tableSql);
  if (!isV2Schema) {
    const legacyCount = await db.execute("SELECT count(*) AS count FROM shared_documents");
    const migrationStatements = [
      "DROP TABLE IF EXISTS shared_documents_e2ee_migration",
      createTable.replace("shared_documents", "shared_documents_e2ee_migration"),
    ];
    if (encryptedColumns) {
      migrationStatements.push(
        `INSERT INTO shared_documents_e2ee_migration (id, ciphertext, iv, encryption_version, created_at, expires_at)
         SELECT id, ciphertext, iv, 2, created_at, expires_at
         FROM shared_documents
         WHERE encryption_version = 2 AND length(ciphertext) > 0 AND length(iv) > 0`
      );
    }
    migrationStatements.push(
      "DROP TABLE shared_documents",
      "ALTER TABLE shared_documents_e2ee_migration RENAME TO shared_documents"
    );
    await db.batch(migrationStatements, "write");
    const remainingCount = await db.execute("SELECT count(*) AS count FROM shared_documents");
    const removed = Number(legacyCount.rows[0]?.count ?? 0) - Number(remainingCount.rows[0]?.count ?? 0);
    console.log(`Removed ${removed} pre-v2 shared document record(s).`);
  }
}

await db.execute(`
  CREATE INDEX IF NOT EXISTS idx_shared_documents_expires_at
  ON shared_documents(expires_at)
`);

const verification = await db.execute("PRAGMA table_info(shared_documents)");
const verifiedColumns = new Set(verification.rows.map(row => row.name));
for (const required of ["id", "ciphertext", "iv", "encryption_version", "created_at", "expires_at"]) {
  if (!verifiedColumns.has(required)) throw new Error(`Missing required column: ${required}`);
}
console.log("Turso E2EE shared_documents table ready.");
db.close();
