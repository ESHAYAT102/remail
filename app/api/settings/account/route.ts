import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { userHasPassword } from "@/lib/data/auth-accounts";
import { deleteDemoUser } from "@/lib/demo/store";
import { isDemoMode } from "@/lib/env";
import { DEMO_COOKIE, getSessionUser } from "@/lib/session";

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const hasPassword = isDemoMode() || await userHasPassword(user.id);
  if (hasPassword && !body.password) {
    return NextResponse.json(
      { error: "Enter your password to delete the account." },
      { status: 400 },
    );
  }

  if (isDemoMode()) {
    if (!deleteDemoUser(user.id, body.password!)) {
      return NextResponse.json(
        { error: "Password is incorrect. Enter it again." },
        { status: 400 },
      );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(DEMO_COOKIE);
    return response;
  }
  if (!auth) {
    return NextResponse.json(
      { error: "Account deletion is unavailable. Try again later." },
      { status: 503 },
    );
  }

  try {
    await auth.api.deleteUser({
      headers: await headers(),
      body: body.password ? { password: body.password } : {},
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = isAPIError(error) ? error.body?.code : undefined;
    if (code === "INVALID_PASSWORD" || code === "CREDENTIAL_ACCOUNT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Password is incorrect. Enter it again." },
        { status: 400 },
      );
    }
    if (code === "SESSION_EXPIRED") {
      return NextResponse.json(
        { error: "Your session has expired. Sign in again." },
        { status: 401 },
      );
    }
    console.error("Unable to delete account", error);
    return NextResponse.json(
      { error: "Unable to delete the account right now. Try again." },
      { status: 500 },
    );
  }
}
