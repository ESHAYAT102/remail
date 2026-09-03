import { NextResponse } from "next/server";
import { Resend } from "resend";
import { saveUserResendCredentials } from "@/lib/data/resend-credentials";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  const body = (await request.json()) as { apiKey?: string; webhookSecret?: string };
  const apiKey = body.apiKey?.trim();
  const webhookSecret = body.webhookSecret?.trim();
  if (!apiKey?.startsWith("re_") || !webhookSecret?.startsWith("whsec_")) {
    return NextResponse.json(
      { error: "Enter a valid Resend API key and webhook signing secret." },
      { status: 400 },
    );
  }
  const test = await new Resend(apiKey).domains.list({ limit: 1 });
  if (test.error) {
    return NextResponse.json({ error: "Resend rejected this API key." }, { status: 400 });
  }
  await saveUserResendCredentials(user.id, apiKey, webhookSecret);
  return NextResponse.json({ connected: true });
}
