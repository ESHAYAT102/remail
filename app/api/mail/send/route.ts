import { NextResponse } from "next/server";
import { consumeComposeAttachments } from "@/lib/data/compose-attachments";
import { composeFromRequest } from "@/lib/mail/compose";
import { MailError } from "@/lib/mail/errors";
import { getMailProvider } from "@/lib/mail/get-provider";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { input, attachmentUploadIds } = await composeFromRequest(request);
    const accountId = new URL(request.url).searchParams.get("account") ?? "";
    if (attachmentUploadIds.length) {
      input.attachments = await consumeComposeAttachments(user, accountId, attachmentUploadIds);
    }
    if (!input.to) {
      return NextResponse.json({ error: "Add a recipient." }, { status: 400 });
    }
    const provider = await getMailProvider(user, accountId);
    const result = await provider.send(input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MailError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("mail/send", error);
    const message =
      error instanceof Error ? error.message : "Unable to send. Check the address and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
