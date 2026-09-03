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
    "How Remail accesses, uses, stores, shares, and deletes personal and Google user data.",
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
            client. Remail is an open-source mail product that lets you connect
            Gmail or use a mailbox on a domain you control. Questions about this
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
            profile image, sign-in method, password hash when you use a password,
            account preferences, and account creation and update times.
          </span>,
          <span key="session">
            <strong>Session and security information.</strong> Session tokens,
            session expiry, IP address, user agent, and operational logs needed to
            secure and troubleshoot the service.
          </span>,
          <span key="google">
            <strong>Google account and Gmail information.</strong> Your Google
            account identifier, email address, name, profile image, OAuth grant,
            Gmail mailbox identity, message and thread metadata, message content,
            attachments, drafts, labels, and mailbox changes you ask Remail to
            make.
          </span>,
          <span key="sync">
            <strong>Gmail connection metadata.</strong> A Gmail history cursor,
            subscription expiry, last-sync time, connection health, and error
            state so Remail can keep the inbox current.
          </span>,
          <span key="hosted">
            <strong>Hosted-mail information.</strong> If you use a custom domain,
            Remail stores the domain, mailbox address, encrypted mailbox
            credential, DNS setup and verification state, and the mail held by
            the connected mail server.
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
          "Keep connected mailboxes synchronized and notify the interface when Gmail changes.",
          "Provide custom-domain mailboxes and help you configure required DNS records.",
          "Prevent abuse, diagnose failures, maintain reliability, and comply with legal obligations.",
          "Respond to support requests and communicate material service or policy changes.",
        ],
      },
    ],
  },
  {
    title: "How Remail handles Google user data",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            Google sign-in and Gmail access are separate. Google sign-in requests
            basic identity information. Remail requests Gmail access only when you
            choose to connect Gmail. That access lets Remail show and search your
            mailbox, read messages and attachments, create and send drafts,
            change read and starred state, apply mailbox labels, and move threads
            between inbox, archive, spam, and trash.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            Remail stores your Google account identity, encrypted access and
            refresh tokens, granted permissions, and the connection metadata
            described above. Gmail remains the source of truth. Gmail message
            bodies and attachments are fetched when needed to serve your request
            and are not persisted in Remail&apos;s application database. Remail
            processes the fetched data to return the requested mailbox view to
            your authenticated browser.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            Remail does not sell Google user data, use it for advertising,
            determine creditworthiness, or use it to train general-purpose AI or
            machine-learning models. People do not read your Gmail data unless
            you give explicit permission for support, access is necessary to
            investigate a security or abuse issue, or access is required by law.
          </>
        ),
      },
      {
        type: "paragraph",
        content: (
          <>
            Remail&apos;s use and transfer of information received from Google APIs
            will adhere to the{" "}
            <LegalLink href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </LegalLink>
            , including its Limited Use requirements.
          </>
        ),
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
          "With Google when Remail makes Gmail API or account requests on your behalf.",
          "With infrastructure providers that host the application, database, mail server, networking, or security services, subject to their role in operating Remail.",
          "When you direct Remail to send mail or otherwise share content with a recipient.",
          "When required by applicable law or necessary to protect users, Remail, or the public from fraud, abuse, or security threats.",
          "As part of a merger, acquisition, or sale of assets only after any consent required by the Google user-data rules or applicable law is obtained.",
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
          "Account information and connection metadata are kept while your account or connected mailbox remains active, and longer only when needed for security, legal obligations, or resolving disputes. Gmail message bodies and attachments are not retained in Remail's application database. Operational logs are kept only as long as reasonably necessary for security and reliability.",
      },
      {
        type: "list",
        items: [
          <span key="disconnect">
            <strong>Disconnect Gmail:</strong> Open Settings, choose Email
            accounts, then remove the Gmail account. Remail stops the Gmail watch,
            asks Google to revoke the grant, clears local token material, and
            deletes the connection metadata. Mail remains in Gmail.
          </span>,
          <span key="google">
            <strong>Revoke at Google:</strong> You can also remove Remail from your{" "}
            <LegalLink href="https://myaccount.google.com/connections">
              Google Account connections
            </LegalLink>
            .
          </span>,
          <span key="delete">
            <strong>Delete Remail:</strong> Open Settings, choose Account, then
            delete the account. This removes the Remail account and its local
            settings, sessions, connected-account records, custom domains, and
            hosted-mail data. Remove Remail from Google Account connections if
            you also want to confirm the Google grant is revoked.
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
          "Remail uses HTTPS in transit, encrypted OAuth tokens and mailbox credentials at rest, access controls, and other reasonable safeguards. No online service can guarantee absolute security, so you should use a strong password, protect your Google account, and report suspected unauthorized access promptly.",
      },
    ],
  },
  {
    title: "Cookies and local storage",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail uses necessary cookies for authentication, security, and saved preferences. It may use browser storage to remember interface state such as open mailbox tabs. Remail does not use third-party advertising cookies. Google may use its own cookies when you choose Google sign-in or Gmail authorization, subject to Google's policies.",
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
          "You can update your name and preferences, disconnect Gmail, revoke Google access, or delete your Remail account from Settings. Depending on where you live, you may also have rights to access, correct, delete, restrict, or receive a copy of personal information. Contact Remail to make a request. Identity verification may be required before a request is completed.",
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
