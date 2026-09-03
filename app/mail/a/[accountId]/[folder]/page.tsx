import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MailFolderLoading } from "@/components/mail/loading-state";
import { FolderRoute } from "@/components/shell/app-shell";
import {
  pageSearchToParams,
  threadQueryFromSearch,
  threadQueryToSearch,
} from "@/lib/mail/query-params";
import {
  folderTitle,
  isKnownMailView,
  isMailFolder,
  mailViewFromSegment,
} from "@/lib/mail/routes";
import { loadFolderPage, loadMailCollections } from "@/lib/mail/server";

type Props = {
  params: Promise<{ accountId: string; folder: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { accountId, folder: folderSegment } = await params;
  const folder = mailViewFromSegment(folderSegment);
  if (!folder) return { title: "Mail" };
  const collections = isMailFolder(folder)
    ? []
    : await loadMailCollections(accountId);
  return { title: folderTitle(folder, collections) };
}

export default function AccountFolderPage(props: Props) {
  return (
    <Suspense fallback={<MailFolderLoading />}>
      <AccountFolderContent {...props} />
    </Suspense>
  );
}

async function AccountFolderContent({
  params,
  searchParams,
}: Props) {
  const { accountId, folder: folderSegment } = await params;
  const folder = mailViewFromSegment(folderSegment);
  if (!folder) notFound();
  const collections = isMailFolder(folder)
    ? []
    : await loadMailCollections(accountId);
  if (!isKnownMailView(folder, collections)) notFound();
  const search = pageSearchToParams(await searchParams);
  const query = threadQueryFromSearch(search);
  const queryString = threadQueryToSearch({
    ...query,
    limit: undefined,
    offset: 0,
  }).toString();
  const initialPage = await loadFolderPage(accountId, folder, queryString);

  return (
    <FolderRoute
      key={`${accountId}:${folder}`}
      folder={folder}
      title={folderTitle(folder, collections)}
      initialPage={initialPage}
      query={query}
    />
  );
}
