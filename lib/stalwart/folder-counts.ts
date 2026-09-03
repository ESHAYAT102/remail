import type { FolderCounts } from "@/lib/mail/types";

export type StalwartMailboxCount = {
  role?: string | null;
  totalEmails?: number;
  unreadEmails?: number;
  totalThreads?: number;
  unreadThreads?: number;
};

function total(mailbox?: StalwartMailboxCount) {
  return mailbox?.totalThreads ?? mailbox?.totalEmails ?? 0;
}

function unread(mailbox?: StalwartMailboxCount) {
  return mailbox?.unreadThreads ?? mailbox?.unreadEmails ?? 0;
}

export function stalwartFolderCounts(
  mailboxes: StalwartMailboxCount[],
  starred: number,
): FolderCounts {
  const byRole = (role: string) =>
    mailboxes.find((mailbox) => mailbox.role === role);
  const inbox = byRole("inbox");
  return {
    inbox: total(inbox),
    smart: unread(inbox),
    starred,
    sent: total(byRole("sent")),
    drafts: total(byRole("drafts")),
    spam: total(byRole("junk")),
    trash: total(byRole("trash")),
    archived: total(byRole("archive")),
  };
}
