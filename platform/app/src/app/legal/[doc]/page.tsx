import { you } from '@robes/copy';
import { notFound } from 'next/navigation';
import { Soon } from '@/components/soon';

const DOCS = { terms: you.legal.terms, privacy: you.legal.privacyNotice } as const;

// Own keys only: `in` would also accept inherited names like "toString".
function isDoc(doc: string): doc is keyof typeof DOCS {
  return Object.hasOwn(DOCS, doc);
}

// Public: the legal texts are linked from sign-in too. Final copy lands with M6.
export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Soon title={DOCS[doc]} />
    </main>
  );
}
