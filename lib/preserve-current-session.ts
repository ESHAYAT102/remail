import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";

/**
 * Multi-session cookies are created when a session is issued. Existing
 * sessions predate the plugin, so preserve the active one before another
 * sign-in can replace the primary session cookie.
 */
export function preserveCurrentSession() {
  return {
    id: "redakt-preserve-current-session",
    endpoints: {
      preserveCurrentDeviceSession: createAuthEndpoint(
        "/multi-session/preserve-current",
        {
          method: "POST",
          use: [sessionMiddleware],
        },
        async (ctx) => {
          const current = ctx.context.session;
          if (!current) return ctx.json({ status: false });

          const token = current.session.token;
          const sessionCookie = ctx.context.authCookies.sessionToken;
          await ctx.setSignedCookie(
            `${sessionCookie.name}_multi-${token.toLowerCase()}`,
            token,
            ctx.context.secret,
            sessionCookie.attributes,
          );
          return ctx.json({ status: true });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
