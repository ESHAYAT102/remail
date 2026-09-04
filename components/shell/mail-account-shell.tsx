import { notFound } from "next/navigation";
import { getUserPreferences } from "@/lib/data/preferences";
import { isDemoMode } from "@/lib/env";
import { HOSTED_MAIL_ACCOUNT_ID } from "@/lib/mail/accounts";
import {
  loadDomains,
  loadFolderCounts,
  loadMailCollections,
  loadMailAccounts,
  requireSessionUser,
} from "@/lib/mail/server";
import { AppShell } from "./app-shell";

export async function MailAccountShell({
  accountId,
  children,
}: {
  accountId: string;
  children: React.ReactNode;
}) {
  const [user, accounts] = await Promise.all([
    requireSessionUser(),
    loadMailAccounts(),
  ]);
  const account = accounts.find((item) => item.id === accountId);
  if (!account) notFound();
  const [folderCounts, collections, domains, preferences] = await Promise.all([
    loadFolderCounts(account.id),
    loadMailCollections(account.id),
    account.id === HOSTED_MAIL_ACCOUNT_ID ? loadDomains() : Promise.resolve([]),
    getUserPreferences(user),
  ]);
  const initialDomain =
    domains.find((domain) => domain.status !== "ok") ?? domains[0] ?? null;
  const demoMode = isDemoMode();

  return (
    <AppShell
      user={user}
      account={account}
      initialDomain={initialDomain}
      folderCounts={folderCounts}
      collections={collections}
      initialPreferences={preferences}
      demoMode={demoMode}
    >
      {children}
    </AppShell>
  );
}
