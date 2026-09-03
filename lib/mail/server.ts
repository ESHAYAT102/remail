import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  applyMailCollectionAppearances,
  listMailCollectionAppearances,
} from "@/lib/data/collection-appearances";
import { getSessionUser } from "@/lib/session";
import { listMailAccounts, resolveMailAccount } from "./accounts";
import { getDomainProvider, getMailProvider } from "./get-provider";
import { mailAccountCacheTag } from "./cache";
import { PAGE_SIZE } from "./list-query";
import { threadQueryFromSearch } from "./query-params";
import type { MailViewId } from "./routes";

export const requireSessionUser = cache(async () => {
  const user = await getSessionUser();
  if (!user) redirect("/");
  return user;
});

const loadMailProvider = cache(async (accountId: string) => {
  const user = await requireSessionUser();
  return getMailProvider(user, accountId);
});

export const loadFolderPage = cache(
  async (accountId: string, folder: MailViewId, queryString: string) => {
    const query = threadQueryFromSearch(new URLSearchParams(queryString));
    const provider = await loadMailProvider(accountId);
    return provider.listThreads(folder, {
      ...query,
      limit: PAGE_SIZE,
      offset: 0,
    });
  },
);

export async function loadThreadDetail(accountId: string, threadId: string) {
  "use cache: private";
  cacheLife({ stale: 30 });
  cacheTag(mailAccountCacheTag(accountId));
  const provider = await loadMailProvider(accountId);
  return provider.getThread(threadId);
}

export const loadDomains = cache(async () => {
  const user = await requireSessionUser();
  return getDomainProvider(user).listDomains();
});

export const loadFolderCounts = cache(async (accountId: string) => {
  const provider = await loadMailProvider(accountId);
  return provider.getFolderCounts();
});

export const loadMailCollections = cache(async (accountId: string) => {
  const user = await requireSessionUser();
  const provider = await loadMailProvider(accountId);
  const [collections, appearances] = await Promise.all([
    provider.listCollections(),
    listMailCollectionAppearances(user, provider.account.id),
  ]);
  return applyMailCollectionAppearances(collections, appearances);
});

export const loadMailAccounts = cache(async () => {
  const user = await requireSessionUser();
  return listMailAccounts(user);
});

export const loadDefaultMailAccount = cache(async () => {
  const user = await requireSessionUser();
  return resolveMailAccount(user);
});
