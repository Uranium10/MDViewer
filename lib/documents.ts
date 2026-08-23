import { getTursoClient } from "@/lib/turso";
import type { SharedDocument } from "@/types/document";

export async function saveDocument(document: SharedDocument) {
  const db = getTursoClient();
  await db.execute({
    sql: `INSERT INTO shared_documents (id, title, markdown, created_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING`,
    args: [document.id, document.title, document.markdown, document.createdAt],
  });
}

export async function findDocumentByMarkdown(markdown:string):Promise<SharedDocument|null>{
  const db=getTursoClient();
  const result=await db.execute({sql:`SELECT id, title, markdown, created_at FROM shared_documents WHERE markdown = ? ORDER BY created_at ASC LIMIT 1`,args:[markdown]});
  const row=result.rows[0];
  if(!row)return null;
  if(typeof row.id!=="string"||typeof row.title!=="string"||typeof row.markdown!=="string"||typeof row.created_at!=="string")throw new Error("Malformed shared document row");
  return{id:row.id,title:row.title,markdown:row.markdown,createdAt:row.created_at};
}

export async function readDocument(id: string): Promise<SharedDocument | null> {
  const db = getTursoClient();
  const result = await db.execute({
    sql: `SELECT id, title, markdown, created_at
          FROM shared_documents
          WHERE id = ?
          LIMIT 1`,
    args: [id],
  });
  const row = result.rows[0];
  if (!row) return null;
  if (typeof row.id !== "string" || typeof row.title !== "string" ||
      typeof row.markdown !== "string" || typeof row.created_at !== "string") {
    throw new Error("Malformed shared document row");
  }
  return { id: row.id, title: row.title, markdown: row.markdown, createdAt: row.created_at };
}
