import { redirect } from "next/navigation";
import { mailFolderHref } from "@/lib/mail/routes";
import { loadDefaultMailAccount } from "@/lib/mail/server";

export default async function MailPage() {
  const account = await loadDefaultMailAccount();
  redirect(mailFolderHref("inbox", undefined, account.id));
}
