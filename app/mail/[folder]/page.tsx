import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { pageSearchToParams } from "@/lib/mail/query-params";
import {
  folderTitle,
  mailFolderHref,
  mailViewFromSegment,
} from "@/lib/mail/routes";
import { loadDefaultMailAccount } from "@/lib/mail/server";

type Props = {
  params: Promise<{ folder: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const folder = mailViewFromSegment((await params).folder);
  return { title: folder ? folderTitle(folder) : "Mail" };
}

export default function FolderPage(props: Props) {
  return (
    <Suspense fallback={null}>
      <FolderRedirect {...props} />
    </Suspense>
  );
}

async function FolderRedirect({ params, searchParams }: Props) {
  const folder = mailViewFromSegment((await params).folder);
  if (!folder) notFound();
  const search = pageSearchToParams(await searchParams);
  const account = await loadDefaultMailAccount();
  return redirect(mailFolderHref(folder, search, account.id));
}
