import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import {
  listStoredMailAccountsByEmail,
  updateMailAccountSyncState,
} from "@/lib/data/mail-accounts";
import { getGooglePubSubConfig } from "@/lib/env";

const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

type PubSubEnvelope = {
  message?: { data?: string; messageId?: string };
  subscription?: string;
};

export async function POST(request: Request) {
  const config = getGooglePubSubConfig();
  if (!config) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, googleKeys, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: config.audience,
    });
    if (
      payload.email !== config.serviceAccountEmail ||
      payload.email_verified !== true
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envelope = (await request.json().catch(() => null)) as PubSubEnvelope | null;
  const data = envelope?.message?.data;
  if (!data) return NextResponse.json({ error: "Invalid message" }, { status: 400 });

  const notification = parseNotification(data);
  if (!notification) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }
  const accounts = await listStoredMailAccountsByEmail(
    "gmail",
    notification.emailAddress,
  );
  await Promise.all(
    accounts.map((account) =>
      updateMailAccountSyncState(account.id, { changed: true }),
    ),
  );
  return new NextResponse(null, { status: 204 });
}

function parseNotification(data: string) {
  try {
    const decoded = JSON.parse(Buffer.from(data, "base64").toString("utf8")) as {
      emailAddress?: unknown;
      historyId?: unknown;
    };
    if (
      typeof decoded.emailAddress !== "string" ||
      (typeof decoded.historyId !== "string" &&
        typeof decoded.historyId !== "number")
    ) {
      return null;
    }
    return {
      emailAddress: decoded.emailAddress,
      historyId: String(decoded.historyId),
    };
  } catch {
    return null;
  }
}
