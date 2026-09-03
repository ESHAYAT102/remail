import { redirect } from "next/navigation";
import { mailSettingsHref } from "@/lib/mail/routes";

export default function DomainsPage() {
  redirect(mailSettingsHref("account"));
}
