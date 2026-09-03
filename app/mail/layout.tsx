import { Suspense } from "react";
import { MailHydrationShell } from "@/components/shell/mail-hydration-shell";

export default function MailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MailHydrationShell />
      <Suspense fallback={null}>{children}</Suspense>
    </>
  );
}
