import { wardrobe } from '@robes/copy';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StackScreen } from '@/components/StackScreen';
import { destinationOf, parseShots } from '@/features/wardrobe/add/flow';
import { ManualAdd } from '@/features/wardrobe/add/ManualAdd';

export default function ManualAddRoute() {
  const { to, photo } = useLocalSearchParams<{ to?: string; photo?: string }>();
  // A read that never landed arrives with its photo (one local file URI, never server data).
  const [attached] = useState(() => parseShots(photo ? `[${photo}]` : undefined)[0]);
  return (
    <StackScreen title={wardrobe.add.doors.manual}>
      <ManualAdd to={destinationOf(to)} {...(attached ? { photo: attached } : {})} />
    </StackScreen>
  );
}
