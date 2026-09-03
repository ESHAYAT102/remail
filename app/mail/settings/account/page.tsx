import type { Metadata } from "next";
import { AccountSettings } from "@/components/settings/account-settings";

export const metadata: Metadata = { title: "Account settings" };

export default function Page() {
  return <AccountSettings />;
}
