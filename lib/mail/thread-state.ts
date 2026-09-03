export async function persistThreadUnread(
  accountId: string,
  threadId: string,
  unread: boolean,
  request: typeof fetch = fetch,
) {
  const response = await request(`/api/mail/threads/${encodeURIComponent(threadId)}?account=${encodeURIComponent(accountId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unread }),
  });
  if (!response.ok) throw new Error("Unable to update this thread.");
}

export async function persistThreadArchive(
  accountId: string,
  threadId: string,
  fromFolder: string,
  request: typeof fetch = fetch,
) {
  const response = await request(`/api/mail/threads/${encodeURIComponent(threadId)}?account=${encodeURIComponent(accountId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "archive", fromFolder }),
  });
  if (!response.ok) throw new Error("Unable to archive this thread.");
}

export async function persistThreadStarred(
  accountId: string,
  threadId: string,
  starred: boolean,
  request: typeof fetch = fetch,
) {
  const response = await request(
    `/api/mail/threads/${encodeURIComponent(threadId)}?account=${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "star", starred }),
    },
  );
  if (!response.ok) throw new Error("Unable to update this star.");
}

export async function persistThreadMove(
  accountId: string,
  threadId: string,
  destination: "inbox" | "spam" | "trash",
  fromFolder: string,
  request: typeof fetch = fetch,
) {
  const response = await request(
    `/api/mail/threads/${encodeURIComponent(threadId)}?account=${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "move", destination, fromFolder }),
    },
  );
  if (!response.ok) throw new Error("Unable to move this thread.");
}

export async function persistThreadCollection(
  accountId: string,
  threadId: string,
  collectionId: string,
  selected: boolean,
  fromFolder: string,
  request: typeof fetch = fetch,
) {
  const response = await request(
    `/api/mail/threads/${encodeURIComponent(threadId)}?account=${encodeURIComponent(accountId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "collection",
        collectionId,
        selected,
        fromFolder,
      }),
    },
  );
  if (!response.ok) throw new Error("Unable to update this conversation.");
}
