import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MailThreadLoading } from "@/components/mail/loading-state";
import { DraftRoute, ThreadRoute } from "@/components/shell/app-shell";
import {
  pageSearchToParams,
  threadQueryFromSearch,
} from "@/lib/mail/query-params";
import {
  isKnownMailView,
  isMailFolder,
  mailViewFromSegment,
} from "@/lib/mail/routes";
import { loadMailCollections, loadThreadDetail } from "@/lib/mail/server";

type Props = {
  params: Promise<{ accountId: string; folder: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = { title: "Conversation" };

export default function AccountThreadPage(props: Props) {
  return (
    <Suspense fallback={<MailThreadLoading />}>
      <AccountThreadContent {...props} />
    </Suspense>
  );
}

async function AccountThreadContent({
  params,
  searchParams,
}: Props) {
  const { accountId, folder: folderSegment, threadId } = await params;
  const folder = mailViewFromSegment(folderSegment);
  if (!folder) notFound();
  const detailPromise = loadThreadDetail(accountId, threadId);
  const collections = isMailFolder(folder)
    ? []
    : await loadMailCollections(accountId);
  if (!isKnownMailView(folder, collections)) notFound();
  const search = pageSearchToParams(await searchParams);
  const query = threadQueryFromSearch(search);
  const detail = await detailPromise;
  if (!detail) notFound();

  if (detail.draftId) return <DraftRoute detail={detail} />;

  return <ThreadRoute folder={folder} detail={detail} query={query} />;
}
