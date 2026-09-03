import { NextResponse } from "next/server";
import { getMailProvider } from "@/lib/mail/get-provider";
import { getSessionUser } from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const url = new URL(_request.url);
  const filename = url.searchParams.get("filename") ?? "attachment";
  const provider = await getMailProvider(user, url.searchParams.get("account"));
  const file = await provider.getAttachment(id, filename);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const safeFilename = file.filename.replace(/["\r\n]/g, "");
  return new NextResponse(Buffer.from(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
