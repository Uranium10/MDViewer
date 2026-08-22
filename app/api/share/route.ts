import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { saveDocument } from "@/lib/documents";
import type { SharedDocument } from "@/types/document";
const MAX_MARKDOWN = 2 * 1024 * 1024;
export async function POST(request: Request) { try { const body = await request.json(); const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : ""; const markdown = typeof body.markdown === "string" ? body.markdown : ""; if (!markdown.trim()) return NextResponse.json({ error: "Markdown 내용을 입력해 주세요." }, { status: 400 }); if (new Blob([markdown]).size > MAX_MARKDOWN) return NextResponse.json({ error: "문서는 2MB 이하여야 합니다." }, { status: 413 }); const id = nanoid(16); const document: SharedDocument = { id, title: title || "제목 없는 작품", markdown, createdAt: new Date().toISOString() }; await saveDocument(document); return NextResponse.json({ id, url: `/s/${id}` }, { status: 201 }); } catch (error) { console.error(error); const isConfigError = error instanceof Error && error.message.includes("TURSO_"); const message = isConfigError ? error.message : "공유 문서를 저장하지 못했습니다."; return NextResponse.json({ error: message }, { status: 500 }); } }
