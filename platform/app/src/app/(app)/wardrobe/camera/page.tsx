import { AddFlow } from '@/components/wardrobe/add/add-flow';
import { destinationOf } from '@/lib/add-hrefs';

// The wardrobe camera (Capture PRD 3c), then Review in its place once photos are in, filing to
// `?to=`. Twin of native app/wardrobe/camera.tsx.
export default async function CameraPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  return <AddFlow to={destinationOf(to)} />;
}
