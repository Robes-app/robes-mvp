// Terms and Privacy notice, ported from the legacy beta pages (public/terms.html, privacy.html) and
// updated for the platform from docs/data-inventory.md. A body entry is a paragraph; an array is a
// list. Founders own the wording: change facts here only when the inventory changes.
// Controller, age (18+), governing law (Ireland) and the lawful bases were settled 4 Nov 2026
// (App Store review). The legacy pages carry the same facts; keep the two in step until cutover.

export type LegalBlock = string | readonly string[];

export interface LegalSection {
  heading: string;
  body: readonly LegalBlock[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: readonly LegalSection[];
  contactHeading: string;
  contactLead: string;
}

const lastUpdated = 'Last updated 4 November 2026.';

const terms: LegalDoc = {
  title: 'Terms of use',
  intro: 'Short on purpose.',
  sections: [
    {
      heading: 'Who we are',
      body: [
        'Robes is run by Robes Technologies Limited, 39 Seapark Road, Clontarf, Dublin D03 R673, Ireland. These terms are the agreement between you and us whenever you use Robes. How we treat your data is in the Privacy notice.',
      ],
    },
    {
      heading: 'What Robes is',
      body: [
        'Robes is a styling service. You share pieces, photos and preferences; Robes creates styling suggestions, imagery and wardrobe notes using automated tools. Suggestions are creative guidance, not professional advice — trust your own eye first. When Robes names a piece you could buy, we are not the seller: the retailer’s own terms apply.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'You sign in with a one-time code we email you, or with Apple or Google; Robes stores no password. You must be 18 or over to create an account. Keep your email account to yourself, hold one account, and use Robes only for your personal styling. You can stop using Robes at any time, and you can delete your account and data yourself under You › Account.',
      ],
    },
    {
      heading: 'Your content',
      body: [
        'Photos and text you upload stay yours. You give us permission to process them so we can create your looks, analyses and boards. Don’t upload images you don’t have the right to share, and don’t upload anyone’s face but your own.',
      ],
    },
    {
      heading: 'Your likeness, your terms',
      body: [
        'The model Robes creates from your close-up, and every picture of a look rendered on it, is yours. We claim no ownership of either. Your face is used only to show you your own looks — never in our marketing, never shown to anyone else, never used to train anything — unless you ask us to in writing. Remove the close-up and your face leaves the model; delete your account and the model goes with it. Sharing a look is your choice alone: a shared look becomes a page anyone with its link can open. Pictures of your looks are illustrations, not photographs — a piece may not sit on you exactly as it does on the model.',
      ],
    },
    {
      heading: 'What can change',
      body: [
        'Robes is under active development. Features may change, images occasionally fail to appear, and what Robes creates can be imperfect. We’d genuinely love to hear when something feels off. We may suspend an account that breaks these terms, and we will tell you about any change to the terms that matters.',
      ],
    },
    {
      heading: 'Our responsibility',
      body: [
        'We are responsible for what the law says we are responsible for, and no more. Nothing in these terms limits a right you have as a consumer where you live.',
      ],
    },
    {
      heading: 'Governing law',
      body: [
        'These terms are governed by the laws of Ireland, and the Irish courts settle any dispute about them. If you live elsewhere in the European Union, you keep the protections of your own country’s consumer law.',
      ],
    },
  ],
  contactHeading: 'Contact',
  contactLead: 'Questions or feedback:',
};

// TODO(founders): retention for feedback, the waitlist, notifications and the audit log isn't
// decided (data-inventory.md "Open items"), so this notice states no period for them.
// TODO(founders): PostHog's retention is set by the plan (data-inventory.md); name the period here
// once it is fixed, so the notice states a number rather than the criterion.
const privacy: LegalDoc = {
  title: 'Privacy notice',
  intro: 'In plain English.',
  sections: [
    {
      heading: 'Who we are',
      body: [
        'Robes is run by Robes Technologies Limited, 39 Seapark Road, Clontarf, Dublin D03 R673, Ireland. We decide how your data is used, which makes us its controller under European data protection law. Anything about it: hello@byrobes.com.',
      ],
    },
    {
      heading: 'What we collect',
      body: [
        'Your email, name and the styling inputs you give us — prompts, wardrobe pieces, any photos you upload (including the optional close-up under Your digital twin), and the facts you give about your size — never your weight. You sign in with a one-time code we email you, or with Apple or Google, so Robes holds no password. We also record in our own database how you use Robes: the pages you open and the actions you take. Robes is for adults: you must be 18 or over, and we do not knowingly hold data about anyone younger.',
      ],
    },
    {
      heading: 'How it’s used',
      body: [
        'Only to run Robes for you: creating looks and analyses, storing your wardrobe and style profile, and making Robes better. We never sell your data and never use it for advertising. These services process it for us:',
        [
          'Your account, wardrobe and style profile live in a Postgres database hosted by Supabase in the EU, reachable only through our own servers.',
          'The app runs on Vercel, in its Dublin region, and on Amazon Web Services in Ireland (eu-west-1).',
          'Your photos are stored on Amazon S3 in Ireland. They are private by default and reach your screen only through short-lived signed links, delivered by Amazon CloudFront.',
          'Photos and prompts are sent to Google Gemini solely to produce your results. Google may process them outside the EU, including in the United States, and does not use them to improve its models.',
          'Photos copied over from the earlier version of Robes stay on Cloudinary until they have moved to Amazon S3, and are then removed from Cloudinary.',
          'Emails are sent through Amazon SES. On the phone app, notifications travel through Expo, Apple and Google.',
          'Errors on our servers are reported to PostHog, on European servers, with email addresses removed and never linked to you. Rate limits are counted by Upstash in the EU.',
          'The waitlist form is checked by Cloudflare Turnstile to keep out bots.',
          'How the app is used is measured in PostHog, on European servers, unless you turn it off.',
        ],
        'Where a service is outside the EU, or run by a company based outside it — Google Gemini, Vercel, Cloudflare and Expo — the transfer is covered by the European Commission’s Standard Contractual Clauses, or by the EU–US Data Privacy Framework where the provider is certified under it.',
      ],
    },
    {
      heading: 'Your location',
      body: [
        'If you allow it, Robes reads your location from your device to dress you for the weather, and for nothing else. It keeps your position only to about a kilometre and replaces it each time it refreshes. Our servers send that rounded position, with nothing else about you, to OpenStreetMap’s Nominatim to name your town, and your town or position to Open-Meteo for the forecast. You can type a town instead, or change or remove it any time under You, and Robes styles you without a forecast if you decline.',
      ],
    },
    {
      heading: 'Your digital twin',
      body: [
        'If you add a close-up under Your digital twin, Robes uses it twice. It reads your colouring from it, and it uses it as the reference for your model — a full-length image of you, created from your face in the photograph and from the facts you give (height, size, bust, waist, age). Every look Robes then composes for you is rendered on that model, so the pictures of your looks carry your face. The model image is created by Google Gemini from your close-up and your facts, and it is stored privately on Amazon S3 alongside your wardrobe photographs. Nothing is read from your body in a photograph: your line comes from the facts and the sliders you set, and you can change either at any time. Remove the close-up and the model is redrawn without your face; remove your account and the model goes with it. Your looks are seen by no one else unless you share one: a shared look becomes a page anyone with its link can open, until you turn the link off.',
      ],
    },
    {
      heading: 'Usage counts and screen recordings',
      body: [
        'Robes measures how the app is used in PostHog, and you can turn this off at any time under You › Privacy. PostHog counts which screens you open and what you tap; it never sees your photos, words or email. If something in the app breaks, PostHog also records the error so we can fix it. Screen recordings are a separate choice: recordings of how you move through Robes, with every word, photo and typed answer hidden. Recordings are stored on European servers, are visible only to us, and are never used for advertising.',
      ],
    },
    {
      heading: 'Emails from Robes',
      body: [
        'Robes can email you: when the looks you asked for are ready, the odd note when your wardrobe is ready for more, when a receipt you forwarded has become pieces, and, if you switch it on, a morning cue with the day’s look. The looks-ready note, the receipt note and the morning cue are on until you turn them off; the nudges stay off until you turn them on. You change any of them under You › Notifications, and every email carries a one-click link to stop it. We send them through Amazon SES. There are no tracking pixels: we record that an email was sent, and nothing about whether you opened it.',
      ],
    },
    {
      heading: 'Receipts you forward',
      body: [
        'If you forward an order confirmation to your own Robes address (yours alone, shown under You › Forward receipts), Robes reads the email to find the pieces in it — their names, brands, colours, prices, sizes and product photographs — and holds them in your Inbox until you look them over. Nothing is filed into your wardrobe without you. The reading is done by Google Gemini, the same model that reads your photographs. The email as it arrived is deleted after seven days; its sender and subject are cleared 90 days after you decide on it, and what remains is the pieces it produced, with links to the retailer’s product images. Forward only emails you are happy for Robes to read.',
      ],
    },
    {
      heading: 'How long we keep it',
      body: [
        [
          'Your account, wardrobe, looks, style profile, close-up and model: for as long as your account exists. Something you remove is deleted for good after 30 days, and everything goes when you delete your account.',
          'Your location: until you change it or delete your account.',
          'The email you forward: deleted after seven days; its sender and subject are cleared 90 days after you decide on it.',
          'What Robes asked Google Gemini, and its answer: the text is cleared after 30 days. A record that a request was made, with its cost and counts but never your words, is kept for 13 months.',
          'A download of your data: seven days.',
          'Server logs: 14 days.',
          'Usage counts unless you turned them off, and screen recordings only if you agreed: kept by PostHog for the period our plan sets, and deleted with your account.',
          'A look you share: until you turn the link off.',
        ],
      ],
    },
    {
      heading: 'The legal basis',
      body: [
        [
          'Our contract with you covers running Robes: your account, wardrobe, looks, style profile and the emails that are part of the service.',
          'Your consent covers your close-up and the model drawn from it, your location, usage counts, screen recordings and the optional emails. You give it in the app and can withdraw it there at any time.',
          'Our legitimate interest in keeping Robes working, secure and clear covers error reports, rate limits and server logs.',
        ],
      ],
    },
    {
      heading: 'Your rights',
      body: [
        'You can see, correct, download or delete what Robes holds about you, object to how it is used, or withdraw consent — in the app or by email — and we answer within a month. You can also complain to the Data Protection Commission, Ireland’s regulator, at dataprotection.ie.',
      ],
    },
    {
      heading: 'Your choices',
      body: [
        'The close-up is optional — every step that asks for a photograph can be skipped, and a model can be drawn from your facts alone. You can update or remove wardrobe pieces at any time. Under You › Account you can download everything you have given Robes, and you can delete your account and data; that includes what PostHog holds about you. Email us if you would rather we did it.',
      ],
    },
  ],
  contactHeading: 'Contact',
  contactLead: 'Anything about your data:',
};

export const legal = {
  lastUpdated,
  docs: { terms, privacy },
} as const;
