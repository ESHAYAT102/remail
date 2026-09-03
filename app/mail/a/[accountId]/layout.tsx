import { Suspense } from "react";
import { MailAccountShell } from "@/components/shell/mail-account-shell";

type Props = {
  children: React.ReactNode;
  params: Promise<{ accountId: string }>;
};

export default function AccountLayout(props: Props) {
  return (
    <Suspense fallback={null}>
      <AccountLayoutContent {...props} />
    </Suspense>
  );
}

async function AccountLayoutContent({
  children,
  params,
}: Props) {
  const { accountId } = await params;
  return (
    <MailAccountShell accountId={accountId}>{children}</MailAccountShell>
  );
}
