import type { ComposeInput } from "./types";

function draftBody(input: ComposeInput, files: File[]) {
  const form = new FormData();
  if (input.from) form.set("from", input.from);
  form.set("to", input.to);
  form.set("cc", input.cc ?? "");
  form.set("bcc", input.bcc ?? "");
  form.set("subject", input.subject);
  form.set("text", input.text);
  if (input.html) form.set("html", input.html);
  if (input.inReplyTo) form.set("inReplyTo", input.inReplyTo);
  if (input.threadId) form.set("threadId", input.threadId);
  if (input.draftId) form.set("draftId", input.draftId);
  for (const file of files) form.append("files", file);
  return form;
}

export async function persistDraft(
  accountId: string,
  input: ComposeInput,
  files: File[],
) {
  const response = await fetch(
    `/api/mail/drafts?account=${encodeURIComponent(accountId)}`,
    { method: "POST", body: draftBody(input, files) },
  );
  const result = (await response.json().catch(() => null)) as {
    id?: string;
    error?: string;
  } | null;
  if (!response.ok || !result?.id) {
    throw new Error(result?.error ?? "Unable to save this draft.");
  }
  return result.id;
}

export async function removeDraft(accountId: string, draftId: string) {
  const params = new URLSearchParams({ account: accountId, id: draftId });
  const response = await fetch(`/api/mail/drafts?${params}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error("Unable to discard this draft.");
  }
}
