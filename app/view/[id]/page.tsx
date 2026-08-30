import type { Metadata } from "next";
import { notFound } from "next/navigation";
import EncryptedSharedReader from "@/components/reader/EncryptedSharedReader";
import { getDocumentAvailability } from "@/lib/document-availability";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "암호화된 공유 문서", robots: { index: false, follow: false } };

export default async function EncryptedSharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{16}$/.test(id)) notFound();
  let availability;
  try {
    availability = await getDocumentAvailability(id);
  } catch {
    throw new Error("공유 문서를 확인하는 중 문제가 발생했습니다.");
  }
  if (availability !== "active") notFound();
  return <EncryptedSharedReader id={id}/>;
}
