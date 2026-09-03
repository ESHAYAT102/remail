import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/data/preferences";
import { parseUserPreferencesPatch } from "@/lib/preferences";
import { getSessionUser } from "@/lib/session";

const THEME_COOKIE = "redakt_theme";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }
  return NextResponse.json({ preferences: await getUserPreferences(user) });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Your session has expired. Sign in again." },
      { status: 401 },
    );
  }

  try {
    const patch = parseUserPreferencesPatch(await request.json());
    const preferences = await updateUserPreferences(user, patch);
    if (patch.theme) {
      const store = await cookies();
      store.set(THEME_COOKIE, preferences.theme, {
        // The root layout reads this before hydration to prevent a theme flash.
        httpOnly: false,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return NextResponse.json({ preferences });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save this preference." },
      { status: 400 },
    );
  }
}
