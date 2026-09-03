import { NextResponse } from "next/server";
import { syncMailAccount } from "@/lib/mail/sync";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await context.params;
  try {
    return NextResponse.json(await syncMailAccount(user, accountId));
  } catch (error) {
    console.error("mail/sync", error);
    return NextResponse.json(
      { error: "Unable to refresh this account." },
      { status: 503 },
    );
  }
}
