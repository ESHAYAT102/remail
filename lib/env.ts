export function isDemoMode() {
  return process.env.DEMO_MODE !== "false";
}

export function getMailHostname() {
  return process.env.MAIL_HOSTNAME ?? "mail.example.com";
}

export function getStalwartConfig() {
  return {
    url: process.env.STALWART_URL ?? "http://localhost:8080",
    adminUser: process.env.STALWART_ADMIN_USER ?? "admin",
    adminSecret: process.env.STALWART_ADMIN_SECRET ?? "",
  };
}

export function getAppUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (!configured) {
    if (isDemoMode()) return "http://localhost:3000";
    throw new Error("BETTER_AUTH_URL is required when DEMO_MODE is false.");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("BETTER_AUTH_URL must be a valid absolute URL.");
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("BETTER_AUTH_URL must be an HTTP(S) origin without a path.");
  }
  return url.origin;
}
