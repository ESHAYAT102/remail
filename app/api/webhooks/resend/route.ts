import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { domains } from "@/lib/db/schema";
import { getUserResendCredentials } from "@/lib/data/resend-credentials";
import { ingestReceivedEmail } from "@/lib/resend/inbound";

export async function POST(request: Request) {
  const payload = await request.text();
  try {
    const candidate = JSON.parse(payload) as {
      data?: { to?: string[]; received_for?: string[] };
    };
    const names = [...(candidate.data?.to ?? []), ...(candidate.data?.received_for ?? [])]
      .map((value) => value.split("@").at(-1)?.replace(/>$/, "").toLowerCase())
      .filter((value): value is string => Boolean(value));
    const [owner] = names.length
      ? await getDb().select().from(domains).where(inArray(domains.name, names))
      : [];
    const credentials = owner
      ? await getUserResendCredentials(owner.userId)
      : null;
    if (!credentials) throw new Error("No Resend credentials found for this domain.");
    const event = new Resend(credentials.apiKey).webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: credentials.webhookSecret,
    });
    if (event.type === "email.received") await ingestReceivedEmail(event.data);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("resend/webhook", error);
    return new NextResponse("Invalid or unprocessable webhook.", { status: 400 });
  }
}
