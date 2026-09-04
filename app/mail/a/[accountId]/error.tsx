"use client";

import { MailRouteError } from "@/components/shell/app-shell";

export default function AccountErrorPage({
  reset,
}: {
  reset: () => void;
}) {
  return <MailRouteError reset={reset} />;
}
