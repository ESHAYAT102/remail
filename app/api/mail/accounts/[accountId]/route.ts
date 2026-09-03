import { NextResponse } from "next/server";
import { disconnectGoogleMailAccount } from "@/lib/google/mail-accounts";
import { getSessionUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await context.params;
  const disconnected = await disconnectGoogleMailAccount(user, accountId);
  if (!disconnected) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
