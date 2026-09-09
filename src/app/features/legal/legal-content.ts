/**
 * The Terms of Service and Privacy Policy, word for word as clapoutcreators.com
 * publishes them (`src/pages/LegalPage.tsx` there). The two sites must never
 * disagree on these, so any edit is made in both places together.
 */

export type LegalKind = 'terms' | 'privacy';

export interface LegalSection {
  heading: string;
  body: string[];
}

export const LEGAL_LAST_UPDATED = 'August 21, 2026';

export const LEGAL_CONTACT_EMAIL = 'clapoutcreators@gmail.com';

export const TERMS_OF_SERVICE: LegalSection[] = [
  {
    heading: '1. About Clapout',
    body: [
      'Clapout is a creator distribution platform operated from Accra, Ghana. We connect brands ("Brands") with micro-influencers and content creators ("Creators") who distribute campaign content on social platforms and are rewarded based on verified performance. By creating an account, joining a campaign, or launching a campaign, you agree to these Terms of Service.',
    ],
  },
  {
    heading: '2. Eligibility',
    body: [
      'You must be at least 18 years old, or the age of majority in your jurisdiction, to use Clapout. Creators must own or control the social media accounts they use to participate in campaigns. Brands must have the right to license the content and materials they provide for distribution.',
    ],
  },
  {
    heading: '3. Campaigns',
    body: [
      'Each campaign includes a brief that states the budget, the reward structure (for example, an amount per 1,000 verified views), the posting requirements, the deadlines, and the maximum number of participating Creators. By joining a campaign, a Creator agrees to follow the brief in full.',
      'Content that violates the brief — including reposts without required edits, muted or low-effort uploads, or content posted outside the campaign window — may be rejected and will not qualify for payment.',
    ],
  },
  {
    heading: '4. Verification and payment',
    body: [
      'Creators must submit a link to their published post through Clapout for review. Rewards are calculated only on performance that Clapout verifies. Views, engagement, or metrics that we determine to be artificial — including bot traffic, purchased views, or engagement pods — are excluded and may lead to removal from the platform.',
      'Verified payouts are made after the campaign window closes, via mobile money or bank transfer for Creators in Ghana, or another method stated in the campaign brief. Payment processing is handled by third-party providers, including Paystack, and is subject to their terms.',
    ],
  },
  {
    heading: '5. Content and conduct',
    body: [
      'Creators may not post content that is unlawful, misleading, hateful, or that infringes the rights of others. Brands may not submit campaign materials they do not have the right to distribute. Clapout may remove content, withhold unverified rewards, or suspend accounts that breach these Terms.',
    ],
  },
  {
    heading: '6. Intellectual property',
    body: [
      'Brands retain ownership of the campaign materials they provide and grant participating Creators a limited licence to use those materials solely for the campaign. Creators retain ownership of the original content they create, and grant the Brand and Clapout a licence to share, embed, and reference that content for the purposes of the campaign and its reporting.',
    ],
  },
  {
    heading: '7. Limitation of liability',
    body: [
      'Clapout provides the platform "as is". To the maximum extent permitted by law, Clapout is not liable for indirect or consequential losses, for the acts of Brands or Creators, or for the availability of third-party social platforms. Nothing in these Terms excludes liability that cannot be excluded by law.',
    ],
  },
  {
    heading: '8. Changes and contact',
    body: [
      'We may update these Terms from time to time. Material changes will be announced on this page with an updated revision date. Continued use of Clapout after changes take effect constitutes acceptance.',
      `Questions about these Terms can be sent to ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
];

export const PRIVACY_POLICY: LegalSection[] = [
  {
    heading: '1. Who we are',
    body: [
      'Clapout ("we", "us") is a creator distribution platform operated from Accra, Ghana. This policy explains what personal data we collect, why we collect it, and the choices you have. It applies to Creators, Brands, and visitors to our website.',
    ],
  },
  {
    heading: '2. Data we collect',
    body: [
      'Account information: your name, email address, phone number, and the social media handles you register with us.',
      'Campaign data: the post links you submit, and the public performance metrics of those posts (views, likes, shares) which we use to verify rewards.',
      'Payment details: the mobile money number or bank account you nominate for payouts. Card and payment processing data is handled by our payment providers (including Paystack) and is not stored on our servers.',
      'Technical data: basic device and usage information collected when you visit our website, used to keep the service secure and improve it.',
    ],
  },
  {
    heading: '3. How we use your data',
    body: [
      'We use your data to operate campaigns — matching Creators with briefs, reviewing submitted posts, verifying performance, and paying rewards; to communicate with you about campaigns and your account; to prevent fraud, including detecting artificial engagement; and to meet our legal and accounting obligations.',
    ],
  },
  {
    heading: '4. Sharing',
    body: [
      'We share data only where needed to run the service: with the Brand whose campaign you join (your handle and the performance of your campaign post), with payment providers to process payouts, and with service providers who host our infrastructure. We do not sell your personal data.',
    ],
  },
  {
    heading: '5. Retention and security',
    body: [
      'We keep account and campaign records for as long as your account is active and as required for legal and accounting purposes, after which they are deleted or anonymised. We use industry-standard safeguards to protect data in transit and at rest.',
    ],
  },
  {
    heading: '6. Your rights',
    body: [
      `You may request access to, correction of, or deletion of your personal data, and you may close your account at any time. To exercise any of these rights, contact ${LEGAL_CONTACT_EMAIL}. If you are in Ghana, you also have rights under the Data Protection Act, 2012 (Act 843), and may contact the Data Protection Commission.`,
    ],
  },
  {
    heading: '7. Changes and contact',
    body: [
      `We may update this policy from time to time; the revision date below reflects the latest version. Questions about this policy can be sent to ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
];

export function legalSections(kind: LegalKind): LegalSection[] {
  return kind === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
}
