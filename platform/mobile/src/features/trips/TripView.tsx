import type { Trip } from '@robes/contracts';
import { trips } from '@robes/copy';
import {
  Button,
  CardSkeleton,
  Eyebrow,
  Heading,
  PrimaryScope,
  Progress,
  Text,
} from '@robes/ui-native';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { dayLabel } from '../plan/plan';
import { tripWeatherLine, useJobTrip, usePinTrip, useRemoveTrip, useTrip } from './trips';

const copy = trips.page;

function TripBody({ trip }: { trip: Trip }) {
  const router = useRouter();
  const pin = usePinTrip(trip);
  const remove = useRemoveTrip();
  const weather = tripWeatherLine(trip);
  return (
    <ScrollView contentContainerClassName="gap-6 px-6 py-6" testID="trip-view">
      <View className="gap-2">
        <Eyebrow>{`${copy.eyebrow} · ${trip.tripLabel}`}</Eyebrow>
        <Heading size="xl">{trip.headline || trip.destination}</Heading>
        <Text tone="muted">
          {trip.dateLine ? `${trip.destination} · ${trip.dateLine}` : trip.destination}
        </Text>
        {weather ? (
          <Text size="small">{`${weather} (${trip.weather?.seasonal ? copy.seasonal : copy.forecast})`}</Text>
        ) : null}
        {trip.stylistSummary ? <Text>{trip.stylistSummary}</Text> : null}
      </View>
      <PrimaryScope>
        <Button
          disabled={trip.pinnedLookIds !== null}
          loading={pin.isPending}
          loadingLabel={copy.pinning}
          onPress={() => pin.mutate({ params: { id: trip.id } })}
        >
          {trip.pinnedLookIds ? copy.pinned : copy.pin}
        </Button>
      </PrimaryScope>
      <View className="gap-4">
        <Heading size="md">{copy.looks}</Heading>
        {trip.looks.map((look, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: looks are fixed once the trip is packed
          <View key={i} className="gap-1 border-l border-hairline pl-3">
            <Eyebrow>{dayLabel(look.date)}</Eyebrow>
            <Text>{`${look.title} · ${look.occasion}`}</Text>
            <Text size="small" tone="muted">
              {look.how}
            </Text>
            {look.items.map((item, j) => {
              const c = trip.capsule[item.capsuleIndex];
              const name = c?.piece?.label ?? c?.name ?? '';
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: formula order is fixed
                <Text key={j} size="small">
                  {`${item.role}: ${name}${c?.piece ? ` (${copy.yours})` : ''}`}
                </Text>
              );
            })}
          </View>
        ))}
      </View>
      <View className="gap-2">
        <Heading size="md">{copy.capsule}</Heading>
        {trip.capsule.map((c, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the capsule order is fixed
          <View key={i} className="gap-0.5">
            <Text>{c.piece?.label ?? c.name}</Text>
            <Text size="small" tone="muted">
              {c.piece ? copy.yours : [c.brand, c.pricePoint].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ))}
        {trip.suitcaseNote ? (
          <Text size="small">{`${copy.suitcase}: ${trip.suitcaseNote}`}</Text>
        ) : null}
      </View>
      <Button
        variant="quiet"
        onPress={() => {
          remove.mutate({ params: { id: trip.id } });
          router.replace('/plan');
        }}
      >
        {copy.remove}
      </Button>
    </ScrollView>
  );
}

export function TripView({ id }: { id: string }) {
  const query = useTrip(id);
  if (query.isError) {
    return (
      <View className="px-6 py-6">
        <Text tone="danger">{errorMessage(query.error)}</Text>
      </View>
    );
  }
  if (!query.data) {
    return (
      <View className="gap-3 px-6 py-6" accessibilityState={{ busy: true }}>
        <CardSkeleton />
        <CardSkeleton />
      </View>
    );
  }
  return <TripBody trip={query.data} />;
}

export function TripJobView({ jobId }: { jobId: string }) {
  const { job, tripId, failed } = useJobTrip(jobId);
  if (tripId) return <TripView id={tripId} />;
  if (failed || job.isError) {
    return (
      <View className="px-6 py-6">
        <Text tone="danger">{trips.progress.failed}</Text>
      </View>
    );
  }
  return (
    <View className="gap-6 px-6 pt-6">
      <Heading size="xl">{trips.progress.title}</Heading>
      <Progress stage="styling" />
      <CardSkeleton />
    </View>
  );
}
