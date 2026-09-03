import type { MailProvider } from "./provider";
import { mailFolderIds } from "./routes.ts";
import type { FolderCounts, ThreadListPage } from "./types";

export type { FolderCounts } from "./types";

/**
 * Sidebar badges show the total number of threads in each mailbox. The smart
 * Unread view is already filtered, so its total is the unread Inbox count.
 * Keep these requests serial: Stalwart allows four concurrent JMAP requests
 * per user, while each list call may issue two requests internally.
 */
export async function collectFolderCounts(
  provider: Pick<MailProvider, "listThreads">,
): Promise<FolderCounts> {
  const pages: ThreadListPage[] = [];
  for (const folder of mailFolderIds) {
    pages.push(await provider.listThreads(folder, { limit: 1, offset: 0 }));
  }

  return Object.fromEntries(
    mailFolderIds.map((folder, index) => [
      folder,
      pages[index].total,
    ]),
  ) as FolderCounts;
}
