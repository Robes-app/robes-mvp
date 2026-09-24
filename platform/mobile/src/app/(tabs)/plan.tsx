import { nav, shell } from '@robes/copy';
import { EmptyState } from '@robes/ui-native';
import { TabScreen } from '@/components/TabScreen';

export default function Plan() {
  return (
    <TabScreen title={nav.plan}>
      <EmptyState title={shell.soon.title} body={shell.soon.body} />
    </TabScreen>
  );
}
