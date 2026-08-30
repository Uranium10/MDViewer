import { getTursoClient } from "@/lib/turso";

export type DocumentAvailability = "active" | "expired" | "missing";

export async function getDocumentAvailability(id: string): Promise<DocumentAvailability> {
  const db = getTursoClient();
  const result = await db.execute({
    sql: "SELECT expires_at FROM shared_documents WHERE id = ? LIMIT 1",
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return "missing";
  if (typeof row.expires_at !== "string") throw new Error("Malformed shared document metadata");
  const timestamp = Date.parse(row.expires_at);
  return !Number.isFinite(timestamp) || timestamp <= Date.now() ? "expired" : "active";
}
