import { redirect } from "next/navigation";
import { getUserPreferences } from "@/lib/data/preferences";
import { isKnownMailView, mailFolderHref } from "@/lib/mail/routes";
import {
  loadDefaultMailAccount,
  loadMailCollections,
  requireSessionUser,
} from "@/lib/mail/server";

export default async function MailPage() {
  const [account, user] = await Promise.all([
    loadDefaultMailAccount(),
    requireSessionUser(),
  ]);
  const [preferences, collections] = await Promise.all([
    getUserPreferences(user),
    loadMailCollections(account.id),
  ]);
  const folder = isKnownMailView(preferences.defaultFolder, collections)
    ? preferences.defaultFolder
    : "inbox";
  redirect(mailFolderHref(folder, undefined, account.id));
}
