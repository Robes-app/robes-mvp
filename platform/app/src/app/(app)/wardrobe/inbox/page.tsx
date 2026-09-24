import { wardrobe } from '@robes/copy';
import { WardrobePlaceholder } from '../placeholder';

export default function InboxPage() {
  return <WardrobePlaceholder current="/wardrobe/inbox" empty={wardrobe.inboxEmpty} />;
}
