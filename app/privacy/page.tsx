import type { Metadata } from "next";
import {
  LEGAL_CONTACT_EMAIL,
  LegalLink,
  LegalPage,
  type LegalSectionContent,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "How Remail accesses, uses, stores, shares, and deletes personal data.",
};

const sections: LegalSectionContent[] = [
  {
    title: "Who this policy covers",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            This policy applies to the Remail website, hosted service, and email
            client. Remail is an open-source mail product for mailboxes on
            domains you control. Questions about this
            policy can be sent to{" "}
            <LegalLink href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
              {LEGAL_CONTACT_EMAIL}
            </LegalLink>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Information Remail collects",
    blocks: [
      {
        type: "list",
        items: [
          <span key="account">
            <strong>Account information.</strong> Your name, email address,
            profile image, password hash, account preferences, and account
            creation and update times.
          </span>,
          <span key="session">
            <strong>Session and security information.</strong> Session tokens,
            session expiry, IP address, user agent, and operational logs needed to
            secure and troubleshoot the service.
          </span>,
          <span key="hosted">
            <strong>Hosted-mail information.</strong> If you use a custom domain,
            Remail stores the domain, mailbox address, encrypted mailbox
            credential, DNS setup and verification state, and the messages and
            attachments in your hosted mailbox. If you connect a Resend API key
            for sending, Remail stores that key encrypted.
          </span>,
        ],
      },
    ],
  },
  {
    title: "How Remail uses information",
    blocks: [
      {
        type: "list",
        items: [
          "Create and secure your account, authenticate requests, and remember your preferences.",
          "Display, search, organize, draft, send, and otherwise process email when you choose those actions.",
          "Provide custom-domain mailboxes and help you configure required DNS records.",
          "Prevent abuse, diagnose failures, maintain reliability, and comply with legal obligations.",
          "Respond to support requests and communicate material service or policy changes.",
        ],
      },
    ],
  },
  {
    title: "Authentication",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail accounts sign in with an email address and password. Remail stores a password hash, never the password itself, and uses it only to verify sign-in attempts.",
      },
      {
        type: "paragraph",
        content:
          "Remail does not sell personal information, use it for advertising, determine creditworthiness, or use it to train general-purpose AI or machine-learning models.",
      },
    ],
  },
  {
    title: "When information is shared",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail does not sell personal information. Information is shared only as needed to provide the service, protect it, comply with law, or complete a transaction you request.",
      },
      {
        type: "list",
        items: [
          "With infrastructure providers that host the application, database, mail server, networking, or security services, subject to their role in operating Remail.",
          "With Resend when you send mail through a connected Resend API key, so the message can be delivered.",
          "When you direct Remail to send mail or otherwise share content with a recipient.",
          "When required by applicable law or necessary to protect users, Remail, or the public from fraud, abuse, or security threats.",
          "As part of a merger, acquisition, or sale of assets, subject to applicable law.",
        ],
      },
    ],
  },
  {
    title: "Retention, disconnection, and deletion",
    blocks: [
      {
        type: "paragraph",
        content:
          "Account information is kept while your account remains active, and longer only when needed for security, legal obligations, or resolving disputes. Operational logs are kept only as long as reasonably necessary for security and reliability.",
      },
      {
        type: "list",
        items: [
          <span key="delete">
            <strong>Delete Remail:</strong> Open Settings, choose Account, then
            delete the account. This removes the Remail account and its local
            settings, sessions, connected-account records, custom domains, and
            hosted-mail data.
          </span>,
        ],
      },
    ],
  },
  {
    title: "Security",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail uses HTTPS in transit, encrypted mailbox credentials at rest, access controls, and other reasonable safeguards. No online service can guarantee absolute security, so you should use a strong, unique password and report suspected unauthorized access promptly.",
      },
    ],
  },
  {
    title: "Cookies and local storage",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail uses necessary cookies for authentication, security, and saved preferences. It may use browser storage to remember interface state such as open mailbox tabs. Remail does not use third-party advertising cookies.",
      },
      {
        type: "paragraph",
        content:
          "Remote images can be used by senders to learn that a message was opened and to receive technical information such as your IP address and browser details. Remail loads remote images by default. You can turn off Load remote images under Settings, then Appearance & reading.",
      },
    ],
  },
  {
    title: "Your choices and rights",
    blocks: [
      {
        type: "paragraph",
        content:
          "You can update your name and preferences or delete your Remail account from Settings. Depending on where you live, you may also have rights to access, correct, delete, restrict, or receive a copy of personal information. Contact Remail to make a request. Identity verification may be required before a request is completed.",
      },
    ],
  },
  {
    title: "International processing and children",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail and its service providers may process information in countries other than the one where you live. Remail is not directed to children under 13, and children under the minimum age required in their country may not use the service without authorization from a parent or guardian.",
      },
    ],
  },
  {
    title: "Changes and contact",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            This policy may change as Remail changes or legal requirements
            evolve. Material changes will be announced in the service or through
            another reasonable channel before they take effect when required.
            Questions or privacy requests can be sent to{" "}
            <LegalLink href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
              {LEGAL_CONTACT_EMAIL}
            </LegalLink>
            .
          </>
        ),
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      active="privacy"
      title="Privacy policy"
      intro={
        <p>
          Remail is built to let you work with email without turning your inbox
          into a data product. This policy explains what Remail accesses, why it
          needs that access, what it stores, and how you can remove it.
        </p>
      }
      sections={sections}
    />
  );
}
