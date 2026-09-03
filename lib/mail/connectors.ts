import type {
  MailAccount,
  MailCapability,
  MailConnectorId,
} from "./types";

export type MailConnectorDefinition = {
  id: MailConnectorId;
  label: string;
  capabilities: readonly MailCapability[];
};

const definitions: Record<MailConnectorId, MailConnectorDefinition> = {
  hosted: {
    id: "hosted",
    label: "Custom email",
    capabilities: [
      "read",
      "send",
      "markUnread",
      "archive",
      "attachments",
      "collections",
      "sort",
    ],
  },
  gmail: {
    id: "gmail",
    label: "Gmail",
    capabilities: [
      "read",
      "send",
      "drafts",
      "markUnread",
      "star",
      "archive",
      "spam",
      "trash",
      "attachments",
      "collections",
      "pushSync",
    ],
  },
};

export function getMailConnectorDefinition(connector: MailConnectorId) {
  return definitions[connector];
}

export function hasMailCapability(
  account: Pick<MailAccount, "capabilities">,
  capability: MailCapability,
) {
  return account.capabilities.includes(capability);
}
