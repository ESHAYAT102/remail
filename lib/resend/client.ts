import "server-only";

import { Resend } from "resend";
import { getUserResendCredentials } from "@/lib/data/resend-credentials";
import { MailError } from "@/lib/mail/errors";

export async function getResend(userId: string) {
  const credentials = await getUserResendCredentials(userId);
  if (!credentials) throw new MailError("Connect Resend before managing email.");
  return new Resend(credentials.apiKey);
}

export function unwrapResend<T>(result: { data: T | null; error: { message: string } | null }) {
  if (result.error || !result.data) {
    throw new MailError(result.error?.message ?? "Resend returned an empty response.");
  }
  return result.data;
}
