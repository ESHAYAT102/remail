import type { Metadata } from "next";
import { AccountSettings } from "@/components/settings/account-settings";
import { userHasPassword } from "@/lib/data/auth-accounts";
import { isDemoMode } from "@/lib/env";
import { requireSessionUser } from "@/lib/mail/server";

export const metadata: Metadata = { title: "Account settings" };

export default async function Page() {
  const user = await requireSessionUser();
  const hasPassword = isDemoMode() || await userHasPassword(user.id);
  return <AccountSettings hasPassword={hasPassword} />;
}
