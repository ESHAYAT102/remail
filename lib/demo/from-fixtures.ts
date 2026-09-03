import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ThreadDetail } from "@/lib/mail/types";
import { parseEml } from "@/lib/render/parse-eml";

export async function threadsFromFixtures(): Promise<ThreadDetail[]> {
  const dir = path.join(process.cwd(), "fixtures");
  const files = (await readdir(dir)).filter((name) => name.endsWith(".eml"));
  const threads: ThreadDetail[] = [];

  for (const file of files) {
    const raw = await readFile(path.join(dir, file));
    const id = `thr_${file.replace(/\.eml$/, "")}`;
    const message = await parseEml(raw, id);
    threads.push({
      id,
      folder: "inbox",
      subject: message.subject,
      from: message.from,
      snippet: message.snippet,
      date: message.date,
      unread: file !== "to-read.eml",
      hasAttachment: message.attachments.some((file) => !file.inline),
      messageCount: 1,
      messages: [message],
    });
  }

  return threads.sort((a, b) => b.date.localeCompare(a.date));
}
