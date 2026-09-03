import "server-only";

import { auth } from "@/lib/auth";
import {
  clearOAuthCredential,
  clearOAuthIdentityToken,
  deleteMailAccount,
  findGoogleOAuthAccount,
  findStoredMailAccount,
  listGoogleOAuthAccounts,
  saveMailAccount,
  updateMailAccountSyncState,
} from "@/lib/data/mail-accounts";
import { GmailClient } from "@/lib/gmail/client";
import { getMailConnectorDefinition } from "@/lib/mail/connectors";
import type { MailAccount } from "@/lib/mail/types";
import type { SessionUser } from "@/lib/session";
import { loadGoogleUserInfo } from "./api";

export async function getGoogleAccessToken(
  user: Pick<SessionUser, "id">,
  mailAccountId: string,
) {
  if (!auth) throw new Error("Google mail is unavailable in demo mode.");
  const mailAccount = await findStoredMailAccount(user.id, mailAccountId);
  if (
    !mailAccount ||
    mailAccount.connector !== "gmail" ||
    !mailAccount.authAccountId
  ) {
    throw new Error("Google mail account not found.");
  }
  return getGoogleAccessTokenForAuthAccount(user, mailAccount.authAccountId);
}

async function getGoogleAccessTokenForAuthAccount(
  user: Pick<SessionUser, "id">,
  authAccountId: string,
) {
  if (!auth) throw new Error("Google mail is unavailable in demo mode.");
  const account = await findGoogleOAuthAccount(user.id, authAccountId);
  if (!account) throw new Error("Google mail account not found.");
  const token = await auth.api.getAccessToken({
    body: { accountId: authAccountId, userId: user.id },
  });
  if (!token.accessToken) throw new Error("Reconnect Google to continue.");
  return token.accessToken;
}

export async function completeGoogleMailAccounts(user: SessionUser) {
  const accounts = await listGoogleOAuthAccounts(user.id);
  const completed: MailAccount[] = [];

  for (const account of accounts) {
    try {
      const accessToken = await getGoogleAccessTokenForAuthAccount(
        user,
        account.id,
      );
      const client = new GmailClient(accessToken);
      const [profile, userInfo] = await Promise.all([
        client.getProfile(),
        loadGoogleUserInfo(accessToken).catch(
          (): Awaited<ReturnType<typeof loadGoogleUserInfo>> => ({}),
        ),
      ]);
      const stored = await saveMailAccount({
        id: account.id,
        userId: user.id,
        connector: "gmail",
        externalAccountId: account.providerAccountId,
        authAccountId: account.id,
        email: profile.emailAddress,
        displayName:
          userInfo.name || profile.emailAddress.split("@")[0] || "Google",
        image: userInfo.picture,
        syncCursor: profile.historyId,
      });
      await clearOAuthIdentityToken(user.id, account.id);
      completed.push(toMailAccount(stored));
    } catch (error) {
      const existing = await findStoredMailAccount(user.id, account.id);
      if (existing) {
        await updateMailAccountSyncState(account.id, {
          status: "reauthorize",
          lastError:
            error instanceof Error ? error.message : "Reconnect Google to continue.",
        });
      }
    }
  }

  return completed;
}

export async function disconnectGoogleMailAccount(
  user: SessionUser,
  mailAccountId: string,
) {
  const mailAccount = await findStoredMailAccount(user.id, mailAccountId);
  if (
    !mailAccount ||
    mailAccount.connector !== "gmail" ||
    !mailAccount.authAccountId
  ) {
    return false;
  }

  try {
    const accessToken = await getGoogleAccessToken(user, mailAccountId);
    await new GmailClient(accessToken).stopWatch().catch(() => undefined);
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: accessToken }),
      cache: "no-store",
    });
  } catch {
    // Deleting local access still succeeds if Google already revoked the grant.
  }

  await clearOAuthCredential(user.id, mailAccount.authAccountId);
  await deleteMailAccount(mailAccount.id);
  return true;
}

function toMailAccount(
  row: NonNullable<Awaited<ReturnType<typeof saveMailAccount>>>,
): MailAccount {
  return {
    id: row.id,
    connector: "gmail",
    email: row.email,
    displayName: row.displayName,
    image: row.image,
    status: row.status === "reauthorize" ? "reauthorize" : "connected",
    capabilities: [...getMailConnectorDefinition("gmail").capabilities],
    syncRevision: row.syncRevision,
  };
}
