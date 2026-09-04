import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { multiSession } from "better-auth/plugins";
import { MAX_DEVICE_ACCOUNTS } from "./auth-policy";
import { getAppUrl, getGoogleOAuthConfig, isDemoMode } from "./env";
import { getDb } from "./db";
import { GOOGLE_IDENTITY_SCOPES } from "./google/scopes";
import * as schema from "./db/schema";
import { deleteUserMailData } from "./data/accounts";
import { preserveCurrentSession } from "./preserve-current-session";

function createAuth() {
  if (isDemoMode()) {
    return null;
  }

  const google = getGoogleOAuthConfig();

  return betterAuth({
    baseURL: getAppUrl(),
    trustedOrigins: (request) => {
      const origins = [getAppUrl()];
      if (process.env.NODE_ENV === "production") return origins;

      const origin = request?.headers.get("origin");
      if (!origin) return origins;
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          origins.push(url.origin);
        }
      } catch {
        // Better Auth will reject malformed origins.
      }
      return origins;
    },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    account: {
      encryptOAuthTokens: true,
      storeStateStrategy: "database",
      accountLinking: {
        trustedProviders: ["google"],
        allowDifferentEmails: true,
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async (user) => {
          await deleteUserMailData(user.id);
        },
      },
    },
    socialProviders: google
      ? {
          google: {
            ...google,
            disableDefaultScope: true,
            scope: [...GOOGLE_IDENTITY_SCOPES],
            includeGrantedScopes: false,
          },
        }
      : undefined,
    plugins: [
      multiSession({ maximumSessions: MAX_DEVICE_ACCOUNTS }),
      preserveCurrentSession(),
      nextCookies(),
    ],
  });
}

export const auth = createAuth();
