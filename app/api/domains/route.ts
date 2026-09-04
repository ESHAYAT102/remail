import { NextResponse } from "next/server";
import { getDomainProvider } from "@/lib/mail/get-provider";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Your session has expired. Sign in again." },
        { status: 401 },
      );
    }
    const domains = await getDomainProvider(user).listDomains();
    return NextResponse.json({ domains });
  } catch {
    return NextResponse.json(
      { error: "Unable to load domains." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Your session has expired. Sign in again." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      name?: string;
      mailbox?: string;
    };
    if (!body.name) {
      return NextResponse.json({ error: "Enter a domain." }, { status: 400 });
    }
    const domain = await getDomainProvider(user).addDomain(
      body.name.trim().toLowerCase(),
      (body.mailbox ?? "you").trim().toLowerCase(),
    );
    return NextResponse.json({ domain });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unable to add this domain.";
    return NextResponse.json(
      { error: msg },
      { status: 400 },
    );
  }
}
