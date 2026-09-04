/**
 * Which addresses count as "me" when rendering threads and building replies.
 * A user can send from the mailbox address, the login identity, a domain
 * mailbox, or any alias on an owned domain, so a single address comparison
 * mislabels their own messages as someone else's.
 */

/** Lowercase, de-duplicated list of the user's own addresses. */
export function ownAddressList(
  ...candidates: Array<string | null | undefined>
): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const candidate of candidates) {
    const address = candidate?.trim().toLowerCase();
    if (!address || seen.has(address)) continue;
    seen.add(address);
    list.push(address);
  }
  return list;
}

/** Case-insensitive membership check against the user's own addresses. */
export function isOwnAddress(
  email: string | null | undefined,
  own: readonly string[],
): boolean {
  const address = email?.trim().toLowerCase();
  return Boolean(address) && own.includes(address as string);
}

/**
 * The address new mail sends from: the preferred alias on the mailbox
 * domain when one is set, otherwise the mailbox address itself.
 */
export function defaultSenderEmail(
  accountEmail: string,
  defaultSenderAlias?: string | null,
  loginEmail?: string | null,
): string {
  const alias = defaultSenderAlias?.trim();
  const domain = accountEmail.split("@").at(-1) ?? "";
  if (!alias) {
    const loginAlias = senderAliasOnDomain(loginEmail, domain);
    return loginAlias ? `${loginAlias}@${domain}` : accountEmail;
  }
  return `${alias}@${domain}`;
}

/** Local part of an address when it belongs to the active mailbox domain. */
export function senderAliasOnDomain(
  email: string | null | undefined,
  domain: string,
): string {
  const address = email?.trim() ?? "";
  const separator = address.lastIndexOf("@");
  if (separator <= 0) return "";
  return address.slice(separator + 1).toLowerCase() === domain.trim().toLowerCase()
    ? address.slice(0, separator).toLowerCase()
    : "";
}
