export const accountDeletionFallback =
  "Unable to delete the account. Check your connection and try again.";

type AccountDeletionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function requestAccountDeletion(
  password?: string,
  request: typeof fetch = fetch,
): Promise<AccountDeletionResult> {
  try {
    const response = await request("/api/settings/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(password ? { password } : {}),
    });

    if (response.ok) {
      return { ok: true };
    }

    const json = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    return {
      ok: false,
      error:
        typeof json?.error === "string" && json.error.trim()
          ? json.error
          : accountDeletionFallback,
    };
  } catch {
    return { ok: false, error: accountDeletionFallback };
  }
}
