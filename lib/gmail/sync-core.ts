export type GmailHistoryClient = {
  getProfile(): Promise<{ historyId: string }>;
  listHistory(
    startHistoryId: string,
    pageToken?: string,
  ): Promise<{
    history?: Array<{ id: string }>;
    historyId?: string;
    nextPageToken?: string;
  }>;
};

export function googleApiErrorStatus(error: unknown) {
  if (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }
  return null;
}

export function isGmailReauthorizationError(error: unknown) {
  const status = googleApiErrorStatus(error);
  return status === 401 || status === 403;
}

export async function readGmailHistory(
  client: GmailHistoryClient,
  currentCursor: string | null,
) {
  if (!currentCursor) {
    return {
      cursor: (await client.getProfile()).historyId,
      changed: false,
    };
  }

  let cursor = currentCursor;
  let changed = false;
  try {
    let pageToken: string | undefined;
    do {
      const page = await client.listHistory(currentCursor, pageToken);
      changed ||= Boolean(page.history?.length);
      cursor = page.historyId ?? cursor;
      pageToken = page.nextPageToken;
    } while (pageToken);
  } catch (error) {
    const status = googleApiErrorStatus(error);
    if (status !== 404 && status !== 410) throw error;
    cursor = (await client.getProfile()).historyId;
    changed = true;
  }
  return { cursor, changed };
}

export async function createGmailWatch(
  client: {
    watch(topicName: string): Promise<{
      historyId: string;
      expiration: string;
    }>;
  },
  topicName: string,
) {
  const watch = await client.watch(topicName);
  const expiration = Number(watch.expiration);
  if (!Number.isFinite(expiration)) {
    throw new Error("Gmail returned an invalid watch expiration.");
  }
  return {
    historyId: watch.historyId,
    expiresAt: new Date(expiration),
  };
}
