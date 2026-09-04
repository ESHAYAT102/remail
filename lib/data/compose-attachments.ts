import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { composeAttachmentChunks } from "@/lib/db/schema";
import { MailError } from "@/lib/mail/errors";
import type { ComposeAttachment } from "@/lib/mail/types";
import type { SessionUser } from "@/lib/session";

const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_CHUNK = 1024 * 1024;

export async function saveComposeAttachmentChunk(input: {
  uploadId: string;
  chunkIndex: number;
  user: SessionUser;
  accountId: string;
  filename: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array;
}) {
  if (!/^[\da-f-]{36}$/i.test(input.uploadId)) throw new MailError("Invalid upload.");
  if (!Number.isSafeInteger(input.chunkIndex) || input.chunkIndex < 0) {
    throw new MailError("Invalid upload chunk.");
  }
  if (!input.filename || input.filename.length > 255 || input.mimeType.length > 255) {
    throw new MailError("Invalid attachment.");
  }
  if (input.size < 0 || input.size > MAX_FILE || input.bytes.byteLength > MAX_CHUNK) {
    throw new MailError("Attachment is too large.");
  }
  await getDb()
    .insert(composeAttachmentChunks)
    .values({
      uploadId: input.uploadId,
      chunkIndex: input.chunkIndex,
      userId: input.user.id,
      accountId: input.accountId,
      filename: input.filename,
      mimeType: input.mimeType || "application/octet-stream",
      size: input.size,
      data: Buffer.from(input.bytes).toString("base64"),
    })
    .onConflictDoNothing();
}

export async function consumeComposeAttachments(
  user: SessionUser,
  accountId: string,
  uploadIds: string[],
): Promise<ComposeAttachment[]> {
  if (uploadIds.length === 0) return [];
  if (uploadIds.length > 25 || uploadIds.some((id) => !/^[\da-f-]{36}$/i.test(id))) {
    throw new MailError("Invalid attachments.");
  }
  const rows = await getDb()
    .select()
    .from(composeAttachmentChunks)
    .where(
      and(
        eq(composeAttachmentChunks.userId, user.id),
        eq(composeAttachmentChunks.accountId, accountId),
        inArray(composeAttachmentChunks.uploadId, uploadIds),
      ),
    )
    .orderBy(asc(composeAttachmentChunks.uploadId), asc(composeAttachmentChunks.chunkIndex));

  let total = 0;
  const attachments = uploadIds.map((uploadId) => {
    const chunks = rows.filter((row) => row.uploadId === uploadId);
    if (!chunks.length || chunks.some((chunk, index) => chunk.chunkIndex !== index)) {
      throw new MailError("An attachment upload is incomplete. Try attaching it again.");
    }
    const first = chunks[0];
    const bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.data, "base64")));
    if (bytes.byteLength !== first.size || bytes.byteLength > MAX_FILE) {
      throw new MailError(`${first.filename} did not upload correctly. Try attaching it again.`);
    }
    total += bytes.byteLength;
    if (total > MAX_TOTAL) throw new MailError("Attachments are larger than 25 MB together.");
    return {
      filename: first.filename,
      mimeType: first.mimeType,
      size: bytes.byteLength,
      data: bytes.toString("base64"),
    };
  });

  await getDb()
    .delete(composeAttachmentChunks)
    .where(
      and(
        eq(composeAttachmentChunks.userId, user.id),
        inArray(composeAttachmentChunks.uploadId, uploadIds),
      ),
    );
  return attachments;
}
