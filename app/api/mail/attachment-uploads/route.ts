import { NextResponse } from "next/server";
import { saveComposeAttachmentChunk } from "@/lib/data/compose-attachments";
import { MailError } from "@/lib/mail/errors";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("account") ?? "";
    await saveComposeAttachmentChunk({
      uploadId: url.searchParams.get("upload") ?? "",
      chunkIndex: Number(url.searchParams.get("chunk")),
      user,
      accountId,
      filename: decodeURIComponent(request.headers.get("x-file-name") ?? ""),
      mimeType: request.headers.get("x-file-type") ?? "application/octet-stream",
      size: Number(request.headers.get("x-file-size")),
      bytes: new Uint8Array(await request.arrayBuffer()),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof MailError ? error.message : "Unable to upload attachment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
