import { Redirect, useLocalSearchParams } from 'expo-router';

// The old address of a new draft (links, the Lookbook's +): the draft sheet took it (D14).
export default function NewLookRoute() {
  const { pieceId } = useLocalSearchParams<{ pieceId?: string }>();
  return (
    <Redirect
      href={{
        pathname: '/looks/draft/[id]',
        params: { id: 'new', ...(pieceId ? { pieceId } : {}) },
      }}
    />
  );
}
