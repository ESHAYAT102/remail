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
      "drafts",
      "markUnread",
      "archive",
      "attachments",
      "collections",
      "sort",
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
