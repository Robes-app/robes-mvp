'use client';

import { useApiClient } from '@robes/api-client/react';
import { firstRun as copy, lookbook } from '@robes/copy';
import { dayMonth, weekdayShort } from '@robes/core/calendar';
import { Icon } from '@robes/icons/web';
import { Button, ErrorText } from '@robes/ui';
import { useState } from 'react';
import { CaptureCamera } from '@/components/capture/capture-camera';
import { localToday } from '@/lib/dates';
import { uploadPhoto } from '@/lib/upload';
import { Frame, QuietLink } from './frame';

// 08 Today's outfit (onboarding PRD R-8; design Q6): the intro, then Home's capture camera (the
// mirror, "Whole outfit in frame?"). Use photo saves it as a look, its picture her photograph, on
// today — no draft drawer (Annie, 17 Nov) — and she lands on Home with it as the day's card.
// Native twin: mobile/src/features/onboarding/OutfitStep.tsx.
export function OutfitStep({
  step,
  busy,
  error,
  onBack,
  onSaved,
  onSkip,
  today = localToday(),
}: {
  step: number;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSaved: (day: string, lookId: string) => void;
  onSkip: () => void;
  today?: string;
}) {
  const api = useApiClient();
  const [camera, setCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const capture = () => {
    setFailed(null);
    setCamera(true);
  };

  // Her photograph → a saved look on today (Home's Capture saves the same look to the same day).
  async function use(file: File) {
    if (saving) return;
    setSaving(true);
    setFailed(null);
    try {
      const asset = await uploadPhoto(api, file, 'look_photo');
      const look = await api.call('looks.create', {
        input: { status: 'saved', pieces: [], photoAssetId: asset.id },
      });
      await api.call('plan.pin', { params: { id: look.id }, input: { dates: [today] } });
      onSaved(today, look.id);
    } catch {
      setFailed(lookbook.draftLook.capture.camera.failed);
      setSaving(false);
    }
  }

  if (camera) {
    return (
      <CaptureCamera
        copy={lookbook.draftLook.capture.camera}
        onUse={(file) => void use(file)}
        onClose={() => setCamera(false)}
        busy={saving || busy}
        error={failed ?? error}
      />
    );
  }

  return (
    <Frame
      step={step}
      title={copy.outfit.title}
      titleEm={copy.outfit.titleEm}
      onBack={onBack}
      fill
      footer={
        <>
          {error ? <ErrorText>{error}</ErrorText> : null}
          <Button variant="primary" loading={busy} onClick={capture}>
            {copy.outfit.capture}
          </Button>
          <QuietLink label={copy.skip} onClick={onSkip} />
        </>
      }
    >
      {/* Design Q6: a dashed warm card to the footer, a head-to-toe outline in it, the camera disc
          at its centre and today's date on a pill in its corner. */}
      <button
        type="button"
        aria-label={copy.outfit.capture}
        disabled={busy}
        onClick={capture}
        className="relative flex min-h-[300px] w-full flex-1 items-center justify-center overflow-hidden rounded-card border border-selected-line border-dashed bg-selected focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 h-[80%] max-h-[330px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-t-[80px] rounded-b-[18px] border border-selected-line border-dashed"
        />
        <span className="relative flex size-16 items-center justify-center rounded-full bg-surface-raised text-ink shadow-[0_6px_16px_-6px_rgb(32_32_33/0.3)]">
          <Icon name="camera" size={24} />
        </span>
        <span className="absolute top-3.5 left-3.5 flex h-7 items-center rounded-pill bg-surface-raised px-3 font-medium font-sans text-[9px] text-ink uppercase tracking-[0.22em]">
          {copy.outfit.today(`${weekdayShort(today)} ${dayMonth(today)}`)}
        </span>
      </button>
    </Frame>
  );
}
