'use client';

import { wardrobe } from '@robes/copy';
import { Button, Dialog } from '@robes/ui';
import { useCallback, useEffect, useState } from 'react';
import { useAnalytics } from '@/components/analytics-provider';
import { ShotCamera, type ShotCameraCopy } from '@/components/capture/shot-camera';
import { REVIEW_MAX, type ShotSession } from '@/lib/add-flow';
import { cameraAvailable } from './camera-capture';

const copy = wardrobe.capture.camera;
const leave = wardrobe.camera;
const CAMERA_COPY: ShotCameraCopy = {
  title: leave.title,
  close: copy.close,
  shutter: copy.shutter,
  photos: copy.photos,
  hint: copy.hint,
  next: copy.next,
  full: copy.full,
  denied: copy.denied,
  useDevice: leave.useDevice,
  ready: copy.ready,
  done: copy.review,
  taken: leave.taken,
};

export function canUseCamera(): boolean {
  return cameraAvailable(window);
}

// Wardrobe › Photo, the camera (Capture PRD 3c.2; canvas frame 3c): the shared ShotCamera, each
// shot starting its read; the ink REVIEW n pill opens the review. Nothing files from here;
// closing with shots asks first. Native twin: mobile/src/features/wardrobe/Camera.tsx.
export function Camera({
  session,
  onReview,
  onClose,
  onUseDevice,
}: {
  session: ShotSession;
  onReview: () => void;
  onClose: () => void;
  onUseDevice: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const { shots } = session;
  const { track } = useAnalytics().analytics;
  useEffect(() => track('camera_opened'), [track]);

  const quit = useCallback(() => {
    session.reset();
    onClose();
  }, [onClose, session]);

  // Nothing taken is dropped without a word.
  const close = useCallback(() => {
    if (asking) return;
    if (shots.length === 0) quit();
    else setAsking(true);
  }, [asking, quit, shots.length]);

  return (
    <>
      <ShotCamera
        copy={CAMERA_COPY}
        shots={shots}
        max={REVIEW_MAX}
        canDone={shots.length > 0}
        onAdd={(file) => void session.add(file)}
        onDone={() => {
          track('camera_filed', { n: shots.length });
          onReview();
        }}
        onClose={close}
        onUseDevice={onUseDevice}
      />
      {/* The app's own confirm, over the camera: nothing taken is dropped without a word. */}
      <Dialog
        open={asking}
        onOpenChange={setAsking}
        title={leave.leave(shots.length)}
        description={leave.leaveBody}
        footer={
          <>
            <Button variant="primary" onClick={quit}>
              {leave.leaveConfirm}
            </Button>
            <Button variant="quiet" onClick={() => setAsking(false)}>
              {leave.stay}
            </Button>
          </>
        }
      />
    </>
  );
}
