import { Onboarding } from "@/components/shell/onboarding";
import { areGoogleCtasEnabled, isDemoMode } from "@/lib/env";
import { getSessionUser } from "@/lib/session";

export const instant = false;

export default async function OnboardingPage({
  searchParams,
}: PageProps<"/onboarding">) {
  const [user, search] = await Promise.all([
    getSessionUser(),
    searchParams,
  ]);
  const googleEnabled = areGoogleCtasEnabled();
  const addingAccount = Boolean(
    user && !isDemoMode() && search.add === "account",
  );

  return (
    <Onboarding
      authenticated={Boolean(user) && !addingAccount}
      addingAccount={addingAccount}
      googleEnabled={googleEnabled}
      initialName={addingAccount ? undefined : user?.name}
      initialError={
        googleEnabled && search.auth === "gmail"
          ? "Gmail wasn’t connected. Choose Gmail to try again."
          : undefined
      }
    />
  );
}
