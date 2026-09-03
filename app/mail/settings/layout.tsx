import { SettingsShell } from "@/components/settings/settings-shell";
import { MailAccountShell } from "@/components/shell/mail-account-shell";
import { HOSTED_MAIL_ACCOUNT_ID } from "@/lib/mail/accounts";

export default function Layout({ children }: LayoutProps<"/mail/settings">) {
  return (
    <MailAccountShell accountId={HOSTED_MAIL_ACCOUNT_ID}>
      <SettingsShell>{children}</SettingsShell>
    </MailAccountShell>
  );
}
