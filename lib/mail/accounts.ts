import "server-only";

import { getMailboxMetadata } from "@/lib/data/accounts";
import {
  findStoredMailAccount,
  listStoredMailAccounts,
} from "@/lib/data/mail-accounts";
import { isDemoMode } from "@/lib/env";
import type { SessionUser } from "@/lib/session";
import { getMailConnectorDefinition } from "./connectors";
import type { MailAccount, MailConnectorId } from "./types";

export const HOSTED_MAIL_ACCOUNT_ID = "hosted";

export function createHostedMailAccount(
  user: SessionUser,
  mailbox?: { email: string } | null,
): MailAccount {
  return {
    id: HOSTED_MAIL_ACCOUNT_ID,
    connector: "hosted",
    email: mailbox?.email ?? user.email,
    displayName: user.name,
    image: user.image,
    status: mailbox ? "connected" : "setup",
    capabilities: [
      ...getMailConnectorDefinition("hosted").capabilities,
    ],
    syncRevision: 0,
  };
}

export async function listMailAccounts(user: SessionUser): Promise<MailAccount[]> {
  const [mailbox, connected] = await Promise.all([
    getMailboxMetadata(user),
    isDemoMode() ? Promise.resolve([]) : listStoredMailAccounts(user.id),
  ]);

  const hosted = createHostedMailAccount(user, mailbox);

  return [hosted, ...connected.map(storedMailAccountToDescriptor)];
}

export async function resolveMailAccount(
  user: SessionUser,
  accountId?: string | null,
) {
  if (!accountId) {
    const accounts = await listMailAccounts(user);
    return (
      accounts.find(
        (account) =>
          account.connector !== "hosted" && account.status === "connected",
      ) ?? accounts[0]
    );
  }

  if (accountId === HOSTED_MAIL_ACCOUNT_ID) {
    return (await listMailAccounts(user))[0];
  }

  const stored = await findStoredMailAccount(user.id, accountId);
  if (!stored) throw new Error("Mail account not found.");
  return storedMailAccountToDescriptor(stored);
}

function storedMailAccountToDescriptor(
  row: Awaited<ReturnType<typeof listStoredMailAccounts>>[number],
): MailAccount {
  if (row.connector !== "gmail") {
    throw new Error(`Unsupported mail connector: ${row.connector}`);
  }
  const connector = row.connector as MailConnectorId;
  return {
    id: row.id,
    connector,
    email: row.email,
    displayName: row.displayName,
    image: row.image,
    status: row.status === "reauthorize" ? "reauthorize" : "connected",
    capabilities: [...getMailConnectorDefinition(connector).capabilities],
    syncRevision: row.syncRevision,
  };
}
