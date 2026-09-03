import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { updateUserName } from "@/lib/data/accounts";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  const body = (await request.json()) as { name?: string };
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Enter a display name." }, { status: 400 });
  }

  const name = body.name.trim();
  try {
    if (!isDemoMode()) {
      if (!auth) {
        return NextResponse.json(
          { error: "Account settings are unavailable. Try again later." },
          { status: 503 },
        );
      }
      await auth.api.updateUser({ headers: await headers(), body: { name } });
    }
    const next = await updateUserName(user, name);
    return NextResponse.json({ user: next });
  } catch {
    return NextResponse.json(
      { error: "Unable to save changes. Check your connection and try again." },
      { status: 500 },
    );
  }
}
