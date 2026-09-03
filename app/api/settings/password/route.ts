import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { changeDemoPassword } from "@/lib/demo/store";
import { isDemoMode } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    revokeOtherSessions?: boolean;
  };
  if (!body.currentPassword) {
    return NextResponse.json({ error: "Enter your current password." }, { status: 400 });
  }
  if (!body.newPassword || body.newPassword.length < 8) {
    return NextResponse.json(
      { error: "Use at least 8 characters for your new password." },
      { status: 400 },
    );
  }
  if (body.newPassword !== body.confirmPassword) {
    return NextResponse.json(
      { error: "Enter the same new password in both fields." },
      { status: 400 },
    );
  }
  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "Choose a new password that differs from your current password." },
      { status: 400 },
    );
  }

  if (isDemoMode()) {
    if (!changeDemoPassword(user.id, body.currentPassword, body.newPassword)) {
      return NextResponse.json(
        { error: "Current password is incorrect. Enter it again." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true });
  }
  if (!auth) {
    return NextResponse.json(
      { error: "Password settings are unavailable. Try again later." },
      { status: 503 },
    );
  }
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
        revokeOtherSessions: body.revokeOtherSessions ?? true,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to update the password. Check your current password or sign in again.",
      },
      { status: 400 },
    );
  }
}
