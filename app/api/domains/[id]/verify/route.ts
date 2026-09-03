import { NextResponse } from "next/server";
import { getDomainProvider } from "@/lib/mail/get-provider";
import { getSessionUser } from "@/lib/session";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const { id } = await context.params;
  try {
    const domain = await getDomainProvider(user).verifyDomain(id);
    return NextResponse.json({ domain });
  } catch {
    return NextResponse.json(
      { error: "Unable to check DNS. Check your connection and try again." },
      { status: 400 },
    );
  }
}
