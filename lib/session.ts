import { cookies, headers } from "next/headers";
import { auth } from "./auth";
import { findDemoUser } from "./demo/store";
import { isDemoMode } from "./env";

export const DEMO_COOKIE = "redakt_demo";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

export const demoUser: SessionUser = {
  id: "demo",
  name: "Ada Meridian",
  email: "ada@redakt.local",
  image: null,
};

export async function getSessionUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    const store = await cookies();
    const id = store.get(DEMO_COOKIE)?.value;
    if (!id) return null;
    const user = findDemoUser(id);
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, image: null };
  }

  if (!auth) return null;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}
