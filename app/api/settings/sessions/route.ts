import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import type { PublicSession } from "@/lib/security";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  if (isDemoMode()) {
    const now = new Date();
    const session: PublicSession = {
      id: "demo-current",
      current: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 30 * 86_400_000).toISOString(),
      userAgent: (await headers()).get("user-agent"),
    };
    return NextResponse.json({ sessions: [session] });
  }

  if (!auth) {
    return NextResponse.json(
      { error: "Session controls are unavailable. Try again later." },
      { status: 503 },
    );
  }
  try {
    const requestHeaders = await headers();
    const [current, sessions] = await Promise.all([
      auth.api.getSession({ headers: requestHeaders }),
      auth.api.listSessions({ headers: requestHeaders }),
    ]);
    return NextResponse.json({
      sessions: sessions.map((session): PublicSession => ({
        id: session.id,
        current: session.id === current?.session.id,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load sessions. Sign in again to continue." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const body = (await request.json()) as { id?: string };
  if (!body.id) {
    return NextResponse.json({ error: "Choose a session." }, { status: 400 });
  }
  if (isDemoMode()) {
    return NextResponse.json(
      { error: "The demo only has your current session." },
      { status: 400 },
    );
  }
  if (!auth) {
    return NextResponse.json(
      { error: "Session controls are unavailable. Try again later." },
      { status: 503 },
    );
  }
  try {
    const requestHeaders = await headers();
    const [current, sessions] = await Promise.all([
      auth.api.getSession({ headers: requestHeaders }),
      auth.api.listSessions({ headers: requestHeaders }),
    ]);
    const session = sessions.find((item) => item.id === body.id);
    if (!session) {
      return NextResponse.json({ error: "This session is no longer active." }, { status: 404 });
    }
    if (session.id === current?.session.id) {
      return NextResponse.json(
        { error: "Use Sign out to end your current session." },
        { status: 400 },
      );
    }
    await auth.api.revokeSession({
      headers: requestHeaders,
      body: { token: session.token },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to sign out this session. Try again." },
      { status: 400 },
    );
  }
}
