import type { Metadata } from "next";
import {
  LEGAL_CONTACT_EMAIL,
  LegalLink,
  LegalPage,
  type LegalSectionContent,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Terms for using the Remail website, hosted service, and email client.",
};

const sections: LegalSectionContent[] = [
  {
    title: "Accepting these terms",
    blocks: [
      {
        type: "paragraph",
        content:
          "These Terms of Service are an agreement between you and the operator of Remail (\"Remail,\" \"we,\" or \"us\"). By creating an account, connecting a mailbox, or using the hosted Remail service, you agree to these terms and the Privacy Policy. If you do not agree, do not use the service.",
      },
    ],
  },
  {
    title: "The service",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail is an email client and mail service for domains you control. Features may differ between the hosted service, demo mode, and self-hosted open-source software.",
      },
    ],
  },
  {
    title: "Accounts and eligibility",
    blocks: [
      {
        type: "list",
        items: [
          "You must be legally able to enter this agreement and meet the minimum age required where you live.",
          "You must provide accurate account information and keep your sign-in credentials secure.",
          "You are responsible for activity under your account and for notifying Remail promptly about suspected unauthorized access.",
          "You may connect only mailboxes and domains that you own or are authorized to use.",
        ],
      },
    ],
  },
  {
    title: "Third-party services",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            Remail relies on third-party infrastructure such as hosting,
            database, mail-delivery, and DNS providers to operate. Those
            services may change, suspend, or stop their APIs, which can affect
            Remail features. Your use of any third-party service remains subject
            to that provider&apos;s own terms.
          </>
        ),
      },
    ],
  },
  {
    title: "Your content and permissions",
    blocks: [
      {
        type: "paragraph",
        content:
          "You retain ownership of email, attachments, domain names, and other content you provide or access through Remail. You give Remail the limited permission needed to host, transmit, format, and process that content to operate features you choose. That permission ends when the content or account is deleted, subject to limited legal, security, and backup retention.",
      },
      {
        type: "paragraph",
        content:
          "You are responsible for your content, recipients, and instructions. You represent that you have the rights and permissions needed to use the content and direct Remail to process or send it.",
      },
    ],
  },
  {
    title: "Acceptable use",
    blocks: [
      {
        type: "paragraph",
        content: "You may not use Remail to:",
      },
      {
        type: "list",
        items: [
          "Break the law, violate another person's rights, or send unlawful, deceptive, abusive, or unsolicited bulk mail.",
          "Distribute malware, phishing content, or material intended to compromise accounts, devices, or networks.",
          "Evade sending limits, spam controls, security controls, or restrictions imposed by Remail or another provider.",
          "Probe or disrupt the service, gain unauthorized access, or use automated traffic that unreasonably burdens the service.",
          "Misrepresent your identity, impersonate another person, or connect a mailbox or domain without authorization.",
        ],
      },
    ],
  },
  {
    title: "Open-source software",
    blocks: [
      {
        type: "paragraph",
        content:
          "The Remail source code is available under its stated open-source license. That license governs copying, modifying, and distributing the code. These terms separately govern use of the hosted Remail service and do not replace third-party licenses included with the software.",
      },
    ],
  },
  {
    title: "Service changes and availability",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail may add, change, limit, or discontinue features. We aim to keep the service reliable, but email delivery and connected-account access depend on networks, DNS, mail servers, and other systems outside Remail's control. We do not promise uninterrupted, error-free, or permanent availability. Reasonable notice will be provided before material negative changes when practical, except for urgent security, abuse, legal, or operational issues.",
      },
    ],
  },
  {
    title: "Suspension and termination",
    blocks: [
      {
        type: "paragraph",
        content:
          "You may stop using Remail or delete your account at any time. Remail may suspend or terminate access when reasonably necessary to address a violation of these terms, security risk, abuse, legal requirement, or harm to the service or others. Where practical, we will provide notice and an opportunity to resolve the issue.",
      },
    ],
  },
  {
    title: "Disclaimers",
    blocks: [
      {
        type: "paragraph",
        content:
          "To the fullest extent permitted by law, the hosted service is provided \"as is\" and \"as available.\" Remail disclaims implied warranties of merchantability, fitness for a particular purpose, noninfringement, and any warranty arising from course of dealing. Nothing in these terms excludes a warranty or consumer right that cannot legally be excluded.",
      },
    ],
  },
  {
    title: "Limitation of liability",
    blocks: [
      {
        type: "paragraph",
        content:
          "To the fullest extent permitted by law, Remail will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, data, goodwill, or business opportunity, arising from the service. Because the hosted service is provided free of charge, Remail's total liability for claims relating to the service will not exceed 100 US dollars. These limits do not apply where the law does not allow them.",
      },
    ],
  },
  {
    title: "Changes to these terms",
    blocks: [
      {
        type: "paragraph",
        content:
          "Remail may update these terms as the service or legal requirements change. Material changes will be announced in the service or through another reasonable channel before they take effect when required. Continuing to use the hosted service after the effective date means you accept the updated terms.",
      },
    ],
  },
  {
    title: "Contact",
    blocks: [
      {
        type: "paragraph",
        content: (
          <>
            Questions about these terms can be sent to{" "}
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

export default function TermsPage() {
  return (
    <LegalPage
      active="terms"
      title="Terms of service"
      intro={
        <p>
          These terms explain the rules for using Remail&apos;s hosted website,
          account and custom-domain mail service.
        </p>
      }
      sections={sections}
    />
  );
}
