import { queryKeys, useApi, useApiClient, useApiMutation } from '@robes/api-client/react';
import { twin, you } from '@robes/copy';
import { Sheet } from '@robes/ui-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { isTerminal, JOB_REFRESH_MS } from '@/features/looks/ideas';
import { PICKER_OPTIONS, uploadPhoto } from '@/features/wardrobe/add-pieces';
import { SettingsRow } from './Settings';

const copy = you.style;
const tw = twin.twinPage;
// The read's job, carried in the route params from the camera to Your digital twin.
export const READ_PARAM = 'read';

// The one door to her twin (plan 2026-11-05 §2.6), behind every selfie button: a sheet that
// offers the front camera or her photo library (the design's selfie screen offers both), the
// photograph uploaded as her close-up and read for her colouring, then Your digital twin at once
// with the read's job in the params so that screen can draw her when it lands. The caller renders
// `chooser`. Web twin: app/src/lib/use-selfie.tsx.
export function useSelfie(): {
  start: () => void;
  chooser: ReactNode;
  busy: boolean;
  error: string | null;
} {
  const api = useApiClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The camera or library opens only once the chooser has fully gone (Sheet onClosed): iOS
  // refuses to present over a closing sheet.
  const picking = useRef<'camera' | 'library' | null>(null);
  const pick = (from: 'camera' | 'library') => {
    picking.current = from;
    setChoosing(false);
  };
  const chosen = () => {
    const from = picking.current;
    picking.current = null;
    if (from) void take(from);
  };
  async function take(from: 'camera' | 'library') {
    let result: ImagePicker.ImagePickerResult;
    if (from === 'camera') {
      const camera = await ImagePicker.requestCameraPermissionsAsync();
      if (!camera.granted) return;
      result = await ImagePicker.launchCameraAsync({
        ...PICKER_OPTIONS,
        cameraType: ImagePicker.CameraType.front,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    }
    const photo = result.canceled ? undefined : result.assets[0];
    if (!photo) return;
    setError(null);
    setBusy(true);
    try {
      const assetId = await uploadPhoto(api, photo, 'headshot');
      const started = await api.call('me.style.analyse', {
        input: { kind: 'colour', assetId },
      });
      router.push({ pathname: '/you/model', params: { [READ_PARAM]: started.jobId } });
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  }
  const chooser = (
    <Sheet
      open={choosing}
      onClose={() => setChoosing(false)}
      onClosed={chosen}
      title={tw.addSelfie}
      closeButton
    >
      <View className="overflow-hidden rounded-soft border border-hairline bg-surface-raised">
        <SettingsRow
          first
          label={tw.selfieCamera}
          onPress={() => pick('camera')}
          testID="selfie-camera"
        />
        <SettingsRow
          label={tw.selfieLibrary}
          onPress={() => pick('library')}
          testID="selfie-library"
        />
      </View>
    </Sheet>
  );
  return { start: () => setChoosing(true), chooser, busy, error };
}

// Your digital twin, landed on from the camera: follows the read named in the params and, when it
// lands, asks for the twin — the close-up is on file only then, so the draw on mount would come
// too soon. The param is cleared once the read is done, whichever way.
export function useSelfieRead(): { reading: boolean; error: string | null } {
  const params = useLocalSearchParams<{ [READ_PARAM]?: string }>();
  const jobId = params[READ_PARAM] ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const draw = useApiMutation('me.model.twin', {
    onSuccess: (data) => queryClient.setQueryData(queryKeys.call('me.model.get'), data),
  });
  const mutate = useRef(draw.mutate);
  mutate.current = draw.mutate;
  const job = useApi(
    'jobs.get',
    { params: { id: jobId ?? '' } },
    {
      enabled: jobId !== null,
      refetchInterval: (q) => (isTerminal(q.state.data) ? false : JOB_REFRESH_MS),
    },
  );
  const [error, setError] = useState<string | null>(null);
  const finished = jobId !== null && (job.isError || isTerminal(job.data));

  useEffect(() => {
    if (!finished) return;
    const data = job.data;
    const read = data?.status === 'succeeded' && !data.output.noSubject;
    if (data?.status !== 'succeeded') setError(copy.failed);
    else if (data.output.noSubject) setError(copy.noFace);
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.style.get') });
    void queryClient.invalidateQueries({ queryKey: queryKeys.route('me.model.get') });
    if (read) mutate.current();
    router.setParams({ [READ_PARAM]: undefined });
  }, [finished, job.data, queryClient, router]);

  return { reading: jobId !== null, error };
}
