import { getTursoClient } from "@/lib/turso";
import type { EncryptedSharedDocument } from "@/types/document";

export type DocumentAvailability = "active" | "expired" | "missing";

function isExpired(expiresAt: string) {
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp <= Date.now();
}

export async function saveEncryptedDocument(document: EncryptedSharedDocument) {
  const db = getTursoClient();
  const result = await db.execute({
    sql: `INSERT INTO shared_documents (id, ciphertext, iv, encryption_version, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING`,
    args: [document.id, document.ciphertext, document.iv, document.encryptionVersion, document.createdAt, document.expiresAt],
  });
  return result.rowsAffected === 1;
}

export async function readEncryptedDocument(id: string): Promise<{ status: DocumentAvailability; document?: EncryptedSharedDocument }> {
  const db = getTursoClient();
  const result = await db.execute({
    sql: `SELECT id, ciphertext, iv, encryption_version, created_at, expires_at
          FROM shared_documents
          WHERE id = ?
          LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return { status: "missing" };
  if (typeof row.expires_at !== "string") throw new Error("Malformed shared document metadata");
  if (isExpired(row.expires_at)) return { status: "expired" };
  if (typeof row.id !== "string" || typeof row.ciphertext !== "string" || typeof row.iv !== "string" ||
      row.encryption_version !== 2 || typeof row.created_at !== "string") {
    throw new Error("Malformed encrypted shared document row");
  }
  return {
    status: "active",
    document: {
      id: row.id,
      ciphertext: row.ciphertext,
      iv: row.iv,
      encryptionVersion: 2,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    },
  };
}

export async function deleteExpiredDocuments() {
  const db = getTursoClient();
  const result = await db.execute("DELETE FROM shared_documents WHERE expires_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')");
  return result.rowsAffected;
}
