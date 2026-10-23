// Terms and Privacy notice, ported from the legacy beta pages (public/terms.html, privacy.html) and
// updated for the platform from docs/data-inventory.md. A body entry is a paragraph; an array is a
// list. Founders own the wording: change facts here only when the inventory changes.
// TODO(founders): name the legal entity (controller) and its address — neither page states one.
// TODO(founders): confirm Robes is still "in beta" after the cutover.
// TODO(founders): neither page names a governing law or the lawful basis for each use; add if needed.

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

const lastUpdated = 'Last updated 23 October 2026.';

const terms: LegalDoc = {
  title: 'Terms of use',
  intro: 'Robes is in beta — these terms are short on purpose.',
  sections: [
    {
      heading: 'What Robes is',
      body: [
        'Robes is a styling service. You share pieces, photos and preferences; Robes creates styling suggestions, imagery and wardrobe notes using automated tools. Suggestions are creative guidance, not professional advice — trust your own eye first.',
      ],
    },
    {
      heading: 'Your account',
      body: [
        'You sign in with a one-time code we email you, or with Apple or Google; Robes stores no password. Keep your email account to yourself and use Robes only for your personal styling. You must be at least 16 to create an account. You can stop using Robes at any time, and you can delete your account and data yourself under You › Account.',
      ],
    },
    {
      heading: 'Your content',
      body: [
        'Photos and text you upload stay yours. You give us permission to process them so we can create your looks, analyses and boards. Don’t upload images you don’t have the right to share.',
      ],
    },
    {
      heading: 'Beta expectations',
      body: [
        'Robes is under active development. Features may change, images occasionally fail to appear, and automatically created output can be imperfect. We’d genuinely love to hear when something feels off.',
      ],
    },
  ],
  contactHeading: 'Contact',
  contactLead: 'Questions or feedback:',
};

// TODO(founders): retention for feedback, the waitlist, notifications and the audit log isn't
// decided (data-inventory.md "Open items"), so this notice states no period for them.
const privacy: LegalDoc = {
  title: 'Privacy notice',
  intro: 'Plain-English version for the Robes beta.',
  sections: [
    {
      heading: 'What we collect',
      body: [
        'Your email, name and the styling inputs you give us — prompts, wardrobe pieces, any photos you upload (including the optional close-up under Your digital twin), and the facts you give about your size — never your weight. You sign in with a one-time code we email you, or with Apple or Google, so Robes holds no password. We also record in our own database how you use Robes: the pages you open and the actions you take.',
      ],
    },
    {
      heading: 'How it’s used',
      body: [
        'Only to run Robes for you: creating looks and analyses, storing your wardrobe and style profile, and improving the product during beta. We never sell your data. These services process it for us:',
        [
          'Your account, wardrobe and style profile live in a Postgres database hosted by Supabase in the EU, reachable only through our own servers.',
          'The app runs on Vercel, in its Dublin region, and on Amazon Web Services in Ireland (eu-west-1).',
          'Your photos are stored on Amazon S3 in Ireland. They are private by default and reach your screen only through short-lived signed links, delivered by Amazon CloudFront.',
          'Photos and prompts are sent to Google Gemini solely to produce your results.',
          'Photos copied over from the earlier version of Robes stay on Cloudinary until they have moved to Amazon S3, and are then removed from Cloudinary.',
          'Emails are sent through Amazon SES. On the phone app, notifications travel through Expo, Apple and Google.',
          'Errors are reported to Sentry with names, emails, prompts and photo links removed. Rate limits are counted by Upstash in the EU.',
          'The waitlist form is checked by Cloudflare Turnstile to keep out bots.',
          'If you agree, how the app is used is measured in PostHog, on European servers.',
        ],
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
        'Robes asks before it measures anything in PostHog, and you can change your answer at any time under You › Privacy. With usage counts on, PostHog counts which screens you open and what you tap; it never sees your photos, words or email. Screen recordings are a separate choice: recordings of how you move through Robes, with every word, photo and typed answer hidden. Recordings are stored on European servers, are visible only to us, and are never used for advertising.',
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
      heading: 'Your choices',
      body: [
        'The close-up is optional — every step that asks for a photograph can be skipped, and a model can be drawn from your facts alone. You can update or remove wardrobe pieces at any time. Under You › Account you can download everything you have given Robes, and you can delete your account and data; that includes what PostHog holds about you.',
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
