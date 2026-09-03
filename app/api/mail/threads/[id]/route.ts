import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { mailAccountCacheTag } from "@/lib/mail/cache";
import { getMailProvider } from "@/lib/mail/get-provider";
import { getSessionUser } from "@/lib/session";
import { isMailView } from "@/lib/mail/routes";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const provider = await getMailProvider(
    user,
    new URL(request.url).searchParams.get("account"),
  );
  const thread = await provider.getThread(id);
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    unread?: unknown;
    action?: unknown;
    fromFolder?: unknown;
    starred?: unknown;
    destination?: unknown;
    collectionId?: unknown;
    selected?: unknown;
  } | null;

  const { id } = await context.params;
  const provider = await getMailProvider(
    user,
    new URL(request.url).searchParams.get("account"),
  );
  let updated = false;
  if (typeof body?.unread === "boolean") {
    updated = await provider.setThreadUnread(id, body.unread);
  } else if (
    body?.action === "archive" &&
    typeof body.fromFolder === "string" &&
    isMailView(body.fromFolder)
  ) {
    updated = await provider.archiveThread(
      id,
      body.fromFolder as Parameters<typeof provider.archiveThread>[1],
    );
  } else if (body?.action === "star" && typeof body.starred === "boolean") {
    updated = await provider.setThreadStarred(id, body.starred);
  } else if (
    body?.action === "move" &&
    (body.destination === "inbox" ||
      body.destination === "spam" ||
      body.destination === "trash") &&
    typeof body.fromFolder === "string" &&
    isMailView(body.fromFolder)
  ) {
    updated = await provider.moveThread(
      id,
      body.destination,
      body.fromFolder,
    );
  } else if (
    body?.action === "collection" &&
    typeof body.collectionId === "string" &&
    body.collectionId.length > 0 &&
    body.collectionId.length <= 512 &&
    typeof body.selected === "boolean" &&
    typeof body.fromFolder === "string" &&
    isMailView(body.fromFolder)
  ) {
    updated = await provider.setThreadCollection(
      id,
      body.collectionId,
      body.selected,
      body.fromFolder,
    );
  } else {
    return NextResponse.json({ error: "Invalid thread update" }, { status: 400 });
  }
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateTag(mailAccountCacheTag(provider.account.id), { expire: 0 });
  return NextResponse.json({ ok: true });
}
