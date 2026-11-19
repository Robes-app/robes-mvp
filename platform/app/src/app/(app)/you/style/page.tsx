import { twin } from '@robes/copy';
import { STYLE_DNA_SECTIONS, type StyleDnaSection } from '@robes/core/home';
import { SettingsPage } from '@/components/settings/settings-chrome';
import { DnaView } from './dna-view';

const isSection = (v: unknown): v is StyleDnaSection =>
  (STYLE_DNA_SECTIONS as readonly unknown[]).includes(v);

export default async function YouStylePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { open } = await searchParams;
  return (
    <SettingsPage title={twin.dnaPage.title} back="/you">
      <DnaView open={isSection(open) ? open : null} />
    </SettingsPage>
  );
}
