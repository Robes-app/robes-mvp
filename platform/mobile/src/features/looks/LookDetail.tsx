import { useApi } from '@robes/api-client/react';
import type { Look } from '@robes/contracts';
import { looks as copy, errors, ui } from '@robes/copy';
import {
  Button,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Image,
  Pill,
  PrimaryScope,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { dayLabel, usePinLook } from '@/features/plan/plan';
import { errorMessage } from '@/lib/errors';
import { renditionUri } from '@/lib/images';
import {
  localDate,
  nextDays,
  useRemoveLook,
  useRenameLook,
  useSaveAsNew,
  useShareLook,
  useShareToken,
  useStopSharing,
  useWearToday,
} from './saved-looks';

const DAY_CHOICES = 14;

// A provisional name is Robes' suggestion: she can keep it or name the look herself.
function Name({ look }: { look: Look }) {
  const rename = useRenameLook();
  const [name, setName] = useState(look.name);
  const dirty = name.trim() !== '' && name.trim() !== look.name;
  return (
    <View className="gap-3">
      <Heading>{look.name}</Heading>
      {look.nameProvisional ? (
        <View className="flex-row items-center gap-3">
          <Text size="small" tone="muted">
            {copy.look.suggested}
          </Text>
          <Button
            variant="quiet"
            onPress={() => rename.mutate({ params: { id: look.id }, input: { name: look.name } })}
          >
            {copy.look.keepName}
          </Button>
        </View>
      ) : null}
      <Field
        label={copy.look.nameLabel}
        value={name}
        onChangeText={setName}
        maxLength={120}
        returnKeyType="done"
      />
      {dirty ? (
        <Button
          variant="secondary"
          loading={rename.isPending}
          loadingLabel={ui.loading}
          onPress={() => rename.mutate({ params: { id: look.id }, input: { name: name.trim() } })}
        >
          {copy.look.saveName}
        </Button>
      ) : null}
    </View>
  );
}

function WearOnDay({ look, open, onClose }: { look: Look; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const pin = usePinLook();
  const days = nextDays(DAY_CHOICES);
  return (
    <Sheet open={open} onClose={onClose} title={copy.look.chooseDay}>
      <View className="flex-row flex-wrap gap-2 pb-6">
        {days.map((date) => (
          <Pill
            key={date}
            disabled={pin.isPending}
            onPress={() =>
              void pin
                .mutateAsync({ params: { id: look.id }, input: { dates: [date], slot: 'day' } })
                .then(() => {
                  toast.show({ message: copy.look.pinned });
                  onClose();
                })
                .catch(() => toast.show({ message: errors.internal }))
            }
          >
            {dayLabel(date, days[0])}
          </Pill>
        ))}
      </View>
    </Sheet>
  );
}

export function LookDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: look, isPending, isError, error } = useApi('looks.get', { params: { id } });
  const wear = useWearToday();
  const remove = useRemoveLook();
  const saveAsNew = useSaveAsNew((newId) => router.push(`/look/${newId}`));
  const shareLook = useShareLook();
  const token = useShareToken(id);
  const stopSharing = useStopSharing(id);
  const [choosingDay, setChoosingDay] = useState(false);
  if (isPending) return <Skeleton width="100%" aspectRatio={4 / 5} />;
  if (isError || !look) return <EmptyState title={errorMessage(error)} />;
  const woreToday = look.lastWornOn === localDate();
  const render = renditionUri(look.image, 360);
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 pb-12">
      {render ? (
        <Image
          source={render}
          alt={copy.look.imageAlt(look.name)}
          blurhash={look.image?.blurhash}
        />
      ) : null}
      <View className="gap-2">
        <Name key={look.name} look={look} />
        <Text tone="muted">{copy.look.worn(look.timesWorn)}</Text>
        {look.note ? <Text>{look.note}</Text> : null}
      </View>
      <View className="gap-3">
        <Eyebrow>{copy.look.pieces}</Eyebrow>
        <View className="flex-row flex-wrap gap-3">
          {look.pieces.map(({ piece }) => {
            const uri = renditionUri(piece.image, 100);
            return (
              <View key={piece.id} className="gap-1" style={{ width: '30%' }}>
                {uri ? <Image source={uri} alt="" blurhash={piece.image?.blurhash} /> : null}
                <Text size="caption" numberOfLines={2}>
                  {piece.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <PrimaryScope>
        <View className="gap-3">
          <Button
            onPress={() => wear.mutate({ params: { id: look.id }, input: { wornOn: localDate() } })}
            disabled={woreToday}
            loading={wear.isPending}
          >
            {woreToday ? copy.look.woreToday : copy.look.wearToday}
          </Button>
          <Button variant="secondary" onPress={() => setChoosingDay(true)}>
            {copy.look.wearOnDay}
          </Button>
          <Button
            variant="secondary"
            loading={shareLook.isPending}
            loadingLabel={ui.loading}
            onPress={() => shareLook.mutate({ input: { subjectType: 'look', subjectId: look.id } })}
          >
            {copy.look.share}
          </Button>
          {token ? (
            <Button
              variant="quiet"
              className="self-center"
              onPress={() => stopSharing.mutate({ params: { token } })}
            >
              {copy.look.stopSharing}
            </Button>
          ) : null}
          <Button
            variant="quiet"
            className="self-center"
            loading={saveAsNew.isPending}
            loadingLabel={ui.loading}
            onPress={() => saveAsNew.mutate({ params: { id: look.id }, input: {} })}
          >
            {copy.look.saveAsNew}
          </Button>
          <Button
            variant="quiet"
            icon="trash"
            className="self-center"
            onPress={() => {
              remove.mutate({ params: { id: look.id } });
              router.back();
            }}
          >
            {copy.result.remove}
          </Button>
        </View>
      </PrimaryScope>
      <WearOnDay look={look} open={choosingDay} onClose={() => setChoosingDay(false)} />
    </ScrollView>
  );
}
