import { wardrobe } from '@robes/copy';
import { StackScreen } from '@/components/StackScreen';
import { LinkImport } from '@/features/wardrobe/LinkImport';

// One subpage header (redline 04): the serif nav title says where she is; no eyebrow below it.
export default function LinkImportRoute() {
  return (
    <StackScreen title={wardrobe.add.link.eyebrow}>
      <LinkImport />
    </StackScreen>
  );
}
