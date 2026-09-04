import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isDemoMode } from "@/lib/env";
import { getInitialLoginFields } from "@/lib/login";
import { LoginScreen } from "@/components/shell/login-screen";
import { resolveMailAccount } from "@/lib/mail/accounts";
import { mailFolderHref } from "@/lib/mail/routes";

export const instant = false;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const [user, search] = await Promise.all([
    getSessionUser(),
    searchParams,
  ]);
  const demoMode = isDemoMode();
  const addingAccount = Boolean(
    user && !demoMode && search.add === "account",
  );
  if (user && !addingAccount) {
    const account = await resolveMailAccount(user);
    redirect(mailFolderHref("inbox", undefined, account.id));
  }

  return (
    <LoginScreen
      initialLogin={getInitialLoginFields(demoMode)}
      addingAccount={addingAccount}
    />
  );
}
