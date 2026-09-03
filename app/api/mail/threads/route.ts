import { NextResponse } from "next/server";
import { getMailProvider } from "@/lib/mail/get-provider";
import { threadQueryFromSearch } from "@/lib/mail/query-params";
import {
  isKnownMailView,
  isMailFolder,
  isMailView,
} from "@/lib/mail/routes";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const folder = params.get("folder") ?? "inbox";
  if (!isMailView(folder)) {
    return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
  }
  const provider = await getMailProvider(user, params.get("account"));
  if (!isMailFolder(folder)) {
    const collections = await provider.listCollections();
    if (!isKnownMailView(folder, collections)) {
      return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
    }
  }
  const page = await provider.listThreads(folder, threadQueryFromSearch(params));
  return NextResponse.json(page);
}
