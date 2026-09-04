import "server-only";

import { getMailboxMetadata } from "@/lib/data/accounts";
import type { SessionUser } from "@/lib/session";
import { getMailConnectorDefinition } from "./connectors";
import type { MailAccount } from "./types";

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
  const mailbox = await getMailboxMetadata(user);
  return [createHostedMailAccount(user, mailbox)];
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
  throw new Error("Mail account not found.");
}
