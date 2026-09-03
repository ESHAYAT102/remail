"use client";

import { MailRouteError } from "@/components/shell/app-shell";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <MailRouteError reset={reset} />;
}
