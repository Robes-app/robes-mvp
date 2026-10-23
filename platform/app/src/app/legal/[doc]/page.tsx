import { legal, you } from '@robes/copy';
import { Heading, Text } from '@robes/ui';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';

const { docs } = legal;

// Own keys only: `in` would also accept inherited names like "toString".
function isDoc(doc: string): doc is keyof typeof docs {
  return Object.hasOwn(docs, doc);
}

const link = 'text-ink underline underline-offset-4';

// Public: the legal texts are linked from sign-in and the waitlist email too.
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const d = docs[doc];
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12">
      <div className="flex flex-col gap-2">
        <PageHeader title={d.title} />
        <Text tone="muted">{d.intro}</Text>
        <Text size="small" tone="faint">
          {legal.lastUpdated}
        </Text>
      </div>
      {d.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <Heading level={2} size="md">
            {s.heading}
          </Heading>
          {s.body.map((b) =>
            typeof b === 'string' ? (
              <Text key={b}>{b}</Text>
            ) : (
              <ul key={b[0]} className="flex list-disc flex-col gap-2 pl-5">
                {b.map((item) => (
                  <Text as="li" key={item}>
                    {item}
                  </Text>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
      <section className="flex flex-col gap-3">
        <Heading level={2} size="md">
          {d.contactHeading}
        </Heading>
        <Text>
          {d.contactLead}{' '}
          <a href={`mailto:${you.helpEmail}`} className={link}>
            {you.helpEmail}
          </a>
        </Text>
      </section>
    </main>
  );
}
