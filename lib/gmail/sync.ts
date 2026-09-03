import "server-only";

import {
  findStoredMailAccount,
  updateMailAccountSyncState,
} from "@/lib/data/mail-accounts";
import { getGooglePubSubConfig } from "@/lib/env";
import { getGoogleAccessToken } from "@/lib/google/mail-accounts";
import type { SessionUser } from "@/lib/session";
import { GmailClient } from "./client";
import {
  createGmailWatch,
  isGmailReauthorizationError,
  readGmailHistory,
} from "./sync-core";

const SUBSCRIPTION_RENEWAL_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function syncGmailAccount(
  user: Pick<SessionUser, "id">,
  accountId: string,
) {
  const state = await requireGmailState(user.id, accountId);
  try {
    const client = new GmailClient(await getGoogleAccessToken(user, accountId));
    const { cursor, changed } = await readGmailHistory(
      client,
      state.syncCursor,
    );
    const updated = await updateMailAccountSyncState(accountId, {
      syncCursor: cursor,
      changed,
      synced: true,
      status: "connected",
      lastError: null,
    });
    await ensureGmailSubscription(
      user,
      accountId,
      client,
      updated ?? state,
    ).catch(() => undefined);
    return {
      changed,
      revision: updated?.syncRevision ?? state.syncRevision,
    };
  } catch (error) {
    if (isGmailReauthorizationError(error)) {
      await markGmailReauthorizationRequired(accountId);
    }
    throw error;
  }
}

export async function ensureGmailSubscription(
  user: Pick<SessionUser, "id">,
  accountId: string,
  existingClient?: GmailClient,
  existingState?: Awaited<ReturnType<typeof requireGmailState>>,
) {
  const config = getGooglePubSubConfig();
  if (!config) return null;
  const state = existingState ?? (await requireGmailState(user.id, accountId));
  if (
    state.subscriptionExpiresAt &&
    state.subscriptionExpiresAt.getTime() - Date.now() >
      SUBSCRIPTION_RENEWAL_WINDOW_MS
  ) {
    return state;
  }
  try {
    const client =
      existingClient ??
      new GmailClient(await getGoogleAccessToken(user, accountId));
    const watch = await createGmailWatch(client, config.topicName);
    return updateMailAccountSyncState(accountId, {
      syncCursor: watch.historyId,
      subscriptionExpiresAt: watch.expiresAt,
      lastError: null,
    });
  } catch (error) {
    if (isGmailReauthorizationError(error)) {
      await markGmailReauthorizationRequired(accountId);
    } else {
      await updateMailAccountSyncState(accountId, {
        lastError: "Gmail push renewal failed.",
      });
    }
    throw error;
  }
}

function markGmailReauthorizationRequired(accountId: string) {
  return updateMailAccountSyncState(accountId, {
    status: "reauthorize",
    subscriptionExpiresAt: null,
    lastError: "Reconnect Google to continue.",
  });
}

async function requireGmailState(userId: string, accountId: string) {
  const state = await findStoredMailAccount(userId, accountId);
  if (!state || state.connector !== "gmail") {
    throw new Error("Gmail account not found.");
  }
  return state;
}
