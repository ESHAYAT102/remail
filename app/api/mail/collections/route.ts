import { NextResponse } from "next/server";
import { saveMailCollectionAppearance } from "@/lib/data/collection-appearances";
import {
  normalizeCollectionColor,
  normalizeCollectionIcon,
} from "@/lib/mail/collection-appearance";
import { normalizeCollectionName } from "@/lib/mail/collections";
import { getMailProvider } from "@/lib/mail/get-provider";
import type { MailCollection } from "@/lib/mail/types";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    collection = await provider.createCollection(name);
  } catch (error) {
    const message =
      error instanceof Error &&
      /^A (folder|label) with this name/.test(error.message)
        ? error.message
        : "Unable to create this folder. Try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (icon && color) {
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
          warning: "Folder created, but its appearance could not be saved.",
        },
        { status: 201 },
      );
    }
  }

  return NextResponse.json({ collection }, { status: 201 });
}
