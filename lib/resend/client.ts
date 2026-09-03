import "server-only";

import { Resend } from "resend";
import { getUserResendCredentials } from "@/lib/data/resend-credentials";

export async function getResend(userId: string) {
  const credentials = await getUserResendCredentials(userId);
  if (!credentials) throw new Error("Connect Resend before managing email.");
  return new Resend(credentials.apiKey);
}

export function unwrapResend<T>(result: { data: T | null; error: { message: string } | null }) {
  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Resend returned an empty response.");
  }
  return result.data;
}
