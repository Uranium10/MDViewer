import { deleteExpiredDocuments } from "@/lib/documents";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ success: false }, { status: 401 });
  }
  try {
    const deleted = await deleteExpiredDocuments();
    return Response.json({ success: true, deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Expired share cleanup failed");
    return Response.json({ success: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
