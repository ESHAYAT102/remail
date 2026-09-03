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
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    account: {
      encryptOAuthTokens: true,
      storeStateStrategy: "database",
      // A narrow Google sign-in must not replace a Gmail-enabled access token.
      // Mailbox credentials are refreshed and expanded only by linkSocial.
      updateAccountOnSignIn: false,
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
