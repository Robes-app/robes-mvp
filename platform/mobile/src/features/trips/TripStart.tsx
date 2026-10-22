import { useApi } from '@robes/api-client/react';
import { trips } from '@robes/copy';
import { defaultTripDates, parseOccasions, tripDatesError } from '@robes/core/trips';
import {
  Button,
  ErrorText,
  Eyebrow,
  Field,
  Heading,
  Pill,
  PrimaryScope,
  Text,
} from '@robes/ui-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { errorMessage } from '@/lib/errors';
import { localDate } from '../looks/saved-looks';
import { useStartTrip } from './trips';

const copy = trips.create;
const MAX_KEY_PIECES = 8;

// Plan a trip: where, when (YYYY-MM-DD), her plans, and the pieces she must pack.
export function TripStart({ initialOccasions = '' }: { initialOccasions?: string } = {}) {
  const [dates, setDates] = useState(() => defaultTripDates(localDate()));
  const [destination, setDestination] = useState('');
  const [occasions, setOccasions] = useState(initialOccasions);
  const [keyPieces, setKeyPieces] = useState<string[]>([]);
  const pieces = useApi('wardrobe.list', { input: { limit: 60 } });
  const start = useStartTrip();
  const valid = /^\d{4}-\d{2}-\d{2}$/;
  const dateError =
    valid.test(dates.dateFrom) && valid.test(dates.dateTo)
      ? tripDatesError(dates.dateFrom, dates.dateTo)
      : null;
  const ready = (pieces.data?.items ?? []).filter((p) => p.status === 'ready');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <ScrollView contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        <Eyebrow>{copy.eyebrow}</Eyebrow>
        <Heading size="xl">{copy.title}</Heading>
        <Field
          label={copy.destinationLabel}
          placeholder={copy.destinationPlaceholder}
          value={destination}
          onChangeText={setDestination}
          maxLength={120}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label={copy.fromLabel}
              value={dates.dateFrom}
              onChangeText={(v) => setDates((d) => ({ ...d, dateFrom: v.trim() }))}
              maxLength={10}
            />
          </View>
          <View className="flex-1">
            <Field
              label={copy.toLabel}
              value={dates.dateTo}
              onChangeText={(v) => setDates((d) => ({ ...d, dateTo: v.trim() }))}
              maxLength={10}
              error={dateError ? copy[dateError] : undefined}
            />
          </View>
        </View>
        <Field
          label={copy.occasionsLabel}
          placeholder={copy.occasionsPlaceholder}
          value={occasions}
          onChangeText={setOccasions}
          multiline
        />
        {ready.length ? (
          <View className="gap-2">
            <Text>{copy.keyPiecesLabel}</Text>
            <View className="flex-row flex-wrap gap-2">
              {ready.map((p) => (
                <Pill
                  key={p.id}
                  selected={keyPieces.includes(p.id)}
                  onPress={() =>
                    setKeyPieces((k) =>
                      k.includes(p.id)
                        ? k.filter((x) => x !== p.id)
                        : k.length < MAX_KEY_PIECES
                          ? [...k, p.id]
                          : k,
                    )
                  }
                >
                  {p.label}
                </Pill>
              ))}
            </View>
          </View>
        ) : null}
        {start.isError ? <ErrorText>{errorMessage(start.error)}</ErrorText> : null}
        <PrimaryScope>
          <Button
            disabled={!destination.trim() || Boolean(dateError)}
            loading={start.isPending || start.isSuccess}
            loadingLabel={copy.submitting}
            onPress={() =>
              start.mutate({
                input: {
                  destination: destination.trim(),
                  ...dates,
                  occasions: parseOccasions(occasions),
                  anchorPieceIds: keyPieces,
                },
              })
            }
          >
            {copy.submit}
          </Button>
        </PrimaryScope>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
