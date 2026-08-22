import { notFound } from "next/navigation";
import { readDocument } from "@/lib/documents";
import NovelReader from "@/components/reader/NovelReader";
export const dynamic = "force-dynamic";
export default async function SharedPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; if (!/^[A-Za-z0-9_-]{16}$/.test(id)) notFound(); let document; try { document = await readDocument(id); } catch { throw new Error("공유 문서를 불러오는 중 문제가 발생했습니다."); } if (!document) notFound(); return <NovelReader documentId={document.id} title={document.title} markdown={document.markdown} />; }
