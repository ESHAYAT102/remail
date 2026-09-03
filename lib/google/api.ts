import "server-only";

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

export async function googleApiRequest<T>(
  accessToken: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string; status?: string };
    } | null;
    throw new GoogleApiError(
      payload?.error?.message ?? `Google API request failed (${response.status})`,
      response.status,
      payload?.error?.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function loadGoogleUserInfo(accessToken: string) {
  return googleApiRequest<{
    email?: string;
    name?: string;
    picture?: string;
  }>(accessToken, "https://openidconnect.googleapis.com/v1/userinfo");
}
