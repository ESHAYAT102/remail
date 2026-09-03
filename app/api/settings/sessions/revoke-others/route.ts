import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  if (isDemoMode()) return NextResponse.json({ ok: true });
  if (!auth) {
    return NextResponse.json(
      { error: "Session controls are unavailable. Try again later." },
      { status: 503 },
    );
  }
  try {
    await auth.api.revokeOtherSessions({ headers: await headers() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to sign out other sessions. Try again." },
      { status: 400 },
    );
  }
}
