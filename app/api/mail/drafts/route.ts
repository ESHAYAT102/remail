import { NextResponse } from "next/server";
import { composeFromRequest } from "@/lib/mail/compose";
import { hasMailCapability } from "@/lib/mail/connectors";
import { MailError } from "@/lib/mail/errors";
import { getMailProvider } from "@/lib/mail/get-provider";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const provider = await getMailProvider(user, url.searchParams.get("account"));
    if (!hasMailCapability(provider.account, "drafts")) {
      return NextResponse.json(
        { error: "Drafts are not available for this account." },
        { status: 400 },
      );
    }
    const { input } = await composeFromRequest(request, {
      requireRecipients: false,
    });
    const result = await provider.saveDraft({ ...input, id: input.draftId });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof MailError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("mail/drafts", error);
    return NextResponse.json(
      { error: "Unable to save this draft. Try again." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing draft" }, { status: 400 });
  const provider = await getMailProvider(user, url.searchParams.get("account"));
  const deleted = await provider.deleteDraft(id);
  return deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Draft not found" }, { status: 404 });
}
