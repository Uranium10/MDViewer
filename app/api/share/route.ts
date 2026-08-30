import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveEncryptedDocument } from "@/lib/documents";
import type { EncryptedSharedDocument } from "@/types/document";

const MAX_CIPHERTEXT_LENGTH = 2_850_000;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
const RETENTION_DAYS = 7;

function noStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  try {
    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      return noStore({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return noStore({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const body = parsed as Record<string, unknown>;
    const ciphertext = typeof body.ciphertext === "string" ? body.ciphertext : "";
    const iv = typeof body.iv === "string" ? body.iv : "";
    if (body.encryptionVersion !== 2 || ciphertext.length < 22 || iv.length !== 16 || !BASE64URL.test(ciphertext) || !BASE64URL.test(iv)) {
      return noStore({ error: "암호화된 공유 문서 형식이 올바르지 않습니다." }, { status: 400 });
    }
    if (ciphertext.length > MAX_CIPHERTEXT_LENGTH) {
      return noStore({ error: "문서는 2MB 이하여야 합니다." }, { status: 413 });
    }
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const id = nanoid(16);
      const document: EncryptedSharedDocument = {
        id,
        ciphertext,
        iv,
        encryptionVersion: 2,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };
      if (await saveEncryptedDocument(document)) {
        return noStore({ id, url: `/view/${id}`, expiresAt: document.expiresAt }, { status: 201 });
      }
    }
    throw new Error("Unable to allocate a unique share id");
  } catch (error) {
    console.error("Encrypted share creation failed");
    const isConfigError = error instanceof Error && error.message.includes("TURSO_");
    return noStore({ error: isConfigError ? error.message : "공유 문서를 저장하지 못했습니다." }, { status: 500 });
  }
}
