import { redirect } from "next/navigation";

export default async function LegacySharedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/view/${encodeURIComponent(id)}`);
}
