import { NextResponse } from "next/server";
import {
  deleteMailCollectionAppearance,
  saveMailCollectionAppearance,
} from "@/lib/data/collection-appearances";
import {
  normalizeCollectionColor,
  normalizeCollectionIcon,
} from "@/lib/mail/collection-appearance";
import { normalizeCollectionName } from "@/lib/mail/collections";
import { getMailProvider } from "@/lib/mail/get-provider";
import type { MailCollection } from "@/lib/mail/types";
import { getSessionUser } from "@/lib/session";

function mutationError(error: unknown, fallback: string) {
  return error instanceof Error &&
    /^(A (folder|label) with this name already exists\.|(Folder|Label) not found\.|Mailbox isn’t ready\. Finish domain setup first\.|Unable to open this mailbox\.|Inbox is unavailable\.)$/.test(
      error.message,
    )
    ? error.message
    : fallback;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    icon?: unknown;
    color?: unknown;
  } | null;
  const name = normalizeCollectionName(body?.name);
  if (!name) {
    return NextResponse.json(
      { error: "Enter a name between 1 and 64 characters." },
      { status: 400 },
    );
  }

  const appearanceRequested =
    body?.icon !== undefined || body?.color !== undefined;
  const icon = normalizeCollectionIcon(body?.icon);
  const color = normalizeCollectionColor(body?.color);
  if (appearanceRequested && (!icon || !color)) {
    return NextResponse.json(
      { error: "Choose a valid folder icon and color." },
      { status: 400 },
    );
  }

  const accountId = new URL(request.url).searchParams.get("account");
  const provider = await getMailProvider(user, accountId);
  let collection: MailCollection;
  try {
    collection = await provider.renameCollection(id, name);
  } catch (error) {
    return NextResponse.json(
      {
        error: mutationError(
          error,
          `Unable to rename this ${provider.account.connector === "gmail" ? "label" : "folder"}. Try again.`,
        ),
      },
      { status: 400 },
    );
  }

  if (icon && color && collection.kind === "folder") {
    try {
      collection = await saveMailCollectionAppearance(
        user,
        provider.account.id,
        collection,
        { icon, color },
      );
    } catch (error) {
      console.error("Unable to save mail collection appearance", error);
      return NextResponse.json(
        {
          collection,
          warning: "Folder renamed, but its appearance could not be saved.",
        },
        { status: 200 },
      );
    }
  }

  return NextResponse.json({ collection });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const accountId = new URL(request.url).searchParams.get("account");
  const provider = await getMailProvider(user, accountId);
  const term = provider.account.connector === "gmail" ? "label" : "folder";
  try {
    const deleted = await provider.deleteCollection(id);
    if (!deleted) {
      return NextResponse.json(
        { error: term === "label" ? "Label not found." : "Folder not found." },
        { status: 404 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: mutationError(
          error,
          `Unable to delete this ${term}. Try again.`,
        ),
      },
      { status: 400 },
    );
  }

  try {
    await deleteMailCollectionAppearance(user, provider.account.id, id);
  } catch (error) {
    console.error("Unable to delete mail collection appearance", error);
  }

  return NextResponse.json({ deleted: true });
}
