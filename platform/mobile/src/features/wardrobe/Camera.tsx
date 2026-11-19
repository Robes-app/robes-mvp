import { wardrobe } from '@robes/copy';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { ShotCamera, type ShotCameraCopy } from '@/features/capture/ShotCamera';
import { nativeAnalytics } from '@/lib/analytics';
import { destinationOf, REVIEW_MAX, reviewHref, sitting } from './add/flow';
import { useShotSession } from './add/reads';

const copy = wardrobe.capture.camera;
const old = wardrobe.camera;
const CAMERA_COPY: ShotCameraCopy = {
  title: old.title,
  close: copy.close,
  shutter: copy.shutter,
  photos: copy.photos,
  hint: copy.hint,
  next: copy.next,
  full: copy.full,
  denied: copy.denied,
  allow: old.allow,
  failed: wardrobe.addFailed,
  ready: copy.ready,
  done: copy.review,
  taken: old.taken,
};

// Wardrobe › Photo, the camera (Capture PRD 3c.2; canvas frame 3c): the shared ShotCamera, each
// shot starting its read; the ink REVIEW n pill opens the review over the camera, so coming back
// keeps the sitting. Nothing files from here; closing with shots asks first.
// Web twin: components/wardrobe/camera.tsx.
export function Camera() {
  const router = useRouter();
  const params = useLocalSearchParams<{ to?: string }>();
  const to = destinationOf(params.to);
  const session = useShotSession();
  const { shots, reset } = session;
  useEffect(() => nativeAnalytics.track('camera_opened'), []);

  // Back from a Review that emptied or filed the sitting: the camera starts afresh.
  useFocusEffect(
    useCallback(() => {
      if (sitting.takeEmptied()) reset();
    }, [reset]),
  );

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/wardrobe');
  }, [router]);

  // Review opens once every photograph is on its way to being read (uploaded, or failed).
  const canReview = shots.length > 0 && shots.every((s) => s.jobId || s.failed);
  const review = () => {
    if (!canReview) return;
    nativeAnalytics.track('camera_filed', { n: shots.length });
    router.push(
      reviewHref({
        to,
        from: 'camera',
        shots: shots.flatMap((s) =>
          s.jobId ? [{ uri: s.uri, width: s.width, height: s.height, jobId: s.jobId }] : [],
        ),
      }),
    );
  };

  function close() {
    if (shots.length === 0) {
      leave();
      return;
    }
    Alert.alert(old.leave(shots.length), old.leaveBody, [
      { text: old.stay, style: 'cancel' },
      { text: old.leaveConfirm, style: 'destructive', onPress: leave },
    ]);
  }

  return (
    <ShotCamera
      copy={CAMERA_COPY}
      shots={shots}
      max={REVIEW_MAX}
      canDone={canReview}
      onAdd={(photo) => void session.add(photo)}
      onDone={review}
      onClose={close}
    />
  );
}
