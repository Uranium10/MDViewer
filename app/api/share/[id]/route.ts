import { NextResponse } from "next/server";
import { readEncryptedDocument } from "@/lib/documents";

const ID_PATTERN = /^[A-Za-z0-9_-]{16}$/;

function noStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) return noStore({ code: "not_found" }, { status: 404 });
  try {
    const result = await readEncryptedDocument(id);
    if (result.status !== "active" || !result.document) {
      return noStore({ code: result.status === "expired" ? "expired" : "not_found" }, { status: 404 });
    }
    return noStore({
      ciphertext: result.document.ciphertext,
      iv: result.document.iv,
      encryptionVersion: result.document.encryptionVersion,
      expiresAt: result.document.expiresAt,
    });
  } catch {
    return noStore({ error: "공유 문서를 불러오지 못했습니다." }, { status: 500 });
  }
}
