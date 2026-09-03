import { NextResponse } from "next/server";
import { authenticateDemoUser, createDemoUser } from "@/lib/demo/store";
import { isDemoMode } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/session";

function sessionCookie(userId: string) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return response;
}

export async function POST(request: Request) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Demo auth is off" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
  }

  const user = body.name
    ? createDemoUser({ email: body.email, name: body.name, password: body.password })
    : authenticateDemoUser(body.email, body.password);

  if (!user) {
    return NextResponse.json(
      { error: "Unable to sign in. Check email and password, then try again." },
      { status: 401 },
    );
  }

  return sessionCookie(user.id);
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DEMO_COOKIE);
  return response;
}
