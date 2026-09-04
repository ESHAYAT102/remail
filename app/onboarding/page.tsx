import { Onboarding } from "@/components/shell/onboarding";
import { isDemoMode } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export const instant = false;

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const [user, search] = await Promise.all([
    getSessionUser(),
    searchParams,
  ]);
  const addingAccount = Boolean(
    user && !isDemoMode() && search.add === "account",
  );

  return (
    <Onboarding
      authenticated={Boolean(user) && !addingAccount}
      addingAccount={addingAccount}
      demoMode={isDemoMode()}
      initialName={addingAccount ? undefined : user?.name}
    />
  );
}
