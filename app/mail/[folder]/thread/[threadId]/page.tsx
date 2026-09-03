import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { pageSearchToParams } from "@/lib/mail/query-params";
import { mailThreadHref, mailViewFromSegment } from "@/lib/mail/routes";
import { loadDefaultMailAccount } from "@/lib/mail/server";

type Props = {
  params: Promise<{ folder: string; threadId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const folder = mailViewFromSegment((await params).folder);
  if (!folder) return { title: "Conversation" };
  return { title: "Conversation" };
}

export default function ThreadPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <ThreadRedirect {...props} />
    </Suspense>
  );
}

async function ThreadRedirect({ params, searchParams }: Props) {
  const { folder: folderSegment, threadId } = await params;
  const folder = mailViewFromSegment(folderSegment);
  if (!folder) notFound();
  const search = pageSearchToParams(await searchParams);
  const account = await loadDefaultMailAccount();
  return redirect(mailThreadHref(folder, threadId, search, account.id));
}
