import { redirect } from "next/navigation";
import { mailSettingsHref } from "@/lib/mail/routes";

export default function DomainPage() {
  redirect(mailSettingsHref("account"));
}
