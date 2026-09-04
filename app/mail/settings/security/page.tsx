import type { Metadata } from "next";
import { SecuritySettings } from "@/components/settings/security-settings";
import { userHasPassword } from "@/lib/data/auth-accounts";
import { isDemoMode } from "@/lib/env";
import { requireSessionUser } from "@/lib/mail/server";

export const metadata: Metadata = { title: "Security settings" };

export default async function Page() {
  const user = await requireSessionUser();
  const hasPassword = isDemoMode() || await userHasPassword(user.id);
  return <SecuritySettings hasPassword={hasPassword} />;
}
