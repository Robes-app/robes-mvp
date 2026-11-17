import { consent, firstRun, twin } from '@robes/copy';
import {
  appCaps,
  Button,
  Em,
  ErrorText,
  Glass,
  Heading,
  maxFontSizeMultiplier,
  Sheet,
  useColor,
} from '@robes/ui-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text as RNText, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { FirstRunFrame } from '@/features/home/FirstRunFrame';
import { ScanLine } from '@/features/looks/ScanLine';
import { AgreeBox, ConsentRows } from '@/features/you/TwinConsent';
import { Lineup, useModel, useModelPick, useTwinStatus } from '@/features/you/twin';
import { FROM_ONBOARDING, SELFIE_ROUTE } from '@/features/you/use-selfie';
import { useConsents } from '@/lib/consents';
import { QuietLink } from './CaptureStep';

const copy = firstRun.twin;
const consentCopy = twin.twinPage.consent;
// The consent's own rows, collecting the close-up only (PRD decision 5: no size facts here).
const ROWS = consentCopy.rows.map(([label, value], i) =>
  i === 0 ? ([label, copy.collects] as const) : ([label, value] as const),
);

// 07 Digital twin (onboarding PRD R-7; design Q5): her twin first, then the five Robes models for
// her identity (the You page's Lineup), the chosen one large. No close-up is taken or sent before
// she ticks the consent (`photo_analysis`, saved before the camera opens); the selfie camera is
// You's own, and brings the close-up back here with its read, which draws her twin.
export function TwinStep({
  step,
  onBack,
  onDone,
  onSkip,
  read,
}: {
  step: number;
  onBack: () => void;
  onDone: (twin: boolean) => void;
  onSkip: () => void;
  // Her close-up's read, followed by Getting to know you itself so it goes on — and draws her
  // twin — after she has moved on to the next step.
  read: { reading: boolean; error: string | null };
}) {
  const router = useRouter();
  const query = useModel();
  const { pick, pending } = useModelPick();
  const { consents, give, saving, error: consentError } = useConsents();
  const [agreed, setAgreed] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  // The camera opens once her yes is on her account (TwinConsent's rule, `wait`).
  const [opening, setOpening] = useState(false);
  const model = query.data;
  const drawing = model?.twin.status === 'pending';
  const status = useTwinStatus(read.reading, drawing);
  const consented = consents?.photo_analysis === true;

  const camera = () => router.push({ pathname: SELFIE_ROUTE, params: { from: FROM_ONBOARDING } });
  const opened = useRef(false);
  useEffect(() => {
    if (!opening || !consented || opened.current) return;
    opened.current = true;
    setOpening(false);
    camera();
  });

  const takeCloseUp = () => {
    opened.current = false;
    if (consented) camera();
    else {
      setOpening(true);
      give({ photo_analysis: true }, { wait: true });
    }
  };

  const twinUrl = model?.twin.imageUrl ?? null;
  const onRobes = model?.preset != null;
  const robes = onRobes ? model?.robesModels.find((m) => m.n === model.preset) : undefined;
  // You, until she picks a Robes model: her twin once drawn, else the close-up's face guide.
  const own = !onRobes;
  const busy = read.reading || drawing;
  // While her twin is read and drawn, her close-up stands dimmed under the scan, as on You ›
  // Your digital twin (testing, 17 Nov: the blank guide read as stuck).
  const hero = own
    ? (twinUrl ?? (busy ? (model?.closeUpUrl ?? null) : null))
    : (robes?.imageUrl ?? null);
  const dimmed = own && busy;

  const title = own ? copy.you : copy.robes;
  const titleEm = own ? (twinUrl ? copy.ready : copy.youEm) : copy.robesEm;
  const needsShot = own && !twinUrl && !busy;

  const footer = needsShot ? (
    <>
      {consented ? null : (
        <AgreeBox
          agreed={agreed}
          label={copy.agree}
          onToggle={() => setAgreed((a) => !a)}
          onPrivacy={() => setPrivacy(true)}
        />
      )}
      {consentError ? <ErrorText>{consent.failed}</ErrorText> : null}
      <Button
        variant="primary"
        disabled={!consented && !agreed}
        loading={saving || opening}
        onPress={takeCloseUp}
        testID="onboarding-twin-go"
      >
        {copy.go}
      </Button>
      <QuietLink label={firstRun.skip} onPress={onSkip} testID="onboarding-skip" />
    </>
  ) : (
    <>
      <Button variant="primary" onPress={() => onDone(own)} testID="onboarding-continue">
        {firstRun.continue}
      </Button>
      <QuietLink
        label={own ? copy.retake : model?.filed ? copy.useTwin : copy.useOwn}
        onPress={() => (own ? takeCloseUp() : pick({ preset: null }))}
      />
    </>
  );

  return (
    <>
      <FirstRunFrame step={step} title={title} titleEm={titleEm} onBack={onBack} footer={footer}>
        <View className="gap-4">
          {read.error ? <ErrorText>{read.error}</ErrorText> : null}
          <View
            className="h-[300px] items-center justify-center overflow-hidden rounded-card bg-surface-sunk"
            testID="onboarding-twin-hero"
          >
            {hero ? (
              <Image
                source={{ uri: hero }}
                contentFit="cover"
                contentPosition={{ top: '20%', left: '50%' }}
                accessibilityLabel={own ? twin.twinPage.you : robes ? title : undefined}
                style={{ width: '100%', height: '100%', opacity: dimmed ? 0.45 : 1 }}
              />
            ) : (
              <FaceGuide
                label={copy.faceGuide}
                onPress={consented || agreed ? takeCloseUp : undefined}
              />
            )}
            {busy ? <ScanLine /> : null}
            {status ? (
              // The status as You's stage says it (designs 06–07): a dot and one line, on glass.
              <View
                className="absolute top-3.5 right-3.5 h-8 flex-row items-center gap-2.5 overflow-hidden rounded-pill px-3.5"
                accessibilityLiveRegion="polite"
                testID="twin-status"
              >
                <Glass tone="veil" className="absolute inset-0 rounded-pill" />
                <View className="size-1.5 rounded-pill bg-accent-warm" />
                <RNText
                  maxFontSizeMultiplier={maxFontSizeMultiplier.label}
                  className="text-ink uppercase"
                  style={appCaps}
                >
                  {status}
                </RNText>
              </View>
            ) : null}
          </View>
          {model ? (
            // No tile for her before she has a twin (Annie, 17 Nov): a blank one read as the way to
            // take the close-up, which is the agreed box and Take my close-up below.
            <Lineup
              model={{
                ...model,
                stand: {
                  imageUrl: null,
                  generic: false,
                  ...model.stand,
                  on: own ? 'twin' : 'robes',
                },
              }}
              pick={pick}
              pending={pending}
            />
          ) : null}
        </View>
      </FirstRunFrame>
      <Sheet open={privacy} onClose={() => setPrivacy(false)} title={consentCopy.eyebrow}>
        <View className="gap-5 px-5 pb-6">
          <Heading style={{ fontSize: 26, lineHeight: 30 }}>
            {consentCopy.title} <Em>{consentCopy.sub}</Em>
          </Heading>
          <ConsentRows rows={ROWS} />
          <Button variant="primary" onPress={() => setPrivacy(false)}>
            {copy.gotIt}
          </Button>
        </View>
      </Sheet>
    </>
  );
}

// Before her close-up (design Q5): a dashed oval with a face drawn in, the camera behind a tap
// once she has agreed.
function FaceGuide({ label, onPress }: { label: string; onPress?: () => void }) {
  const line = useColor('selected-line');
  const muted = useColor('ink-muted');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      disabled={!onPress}
      onPress={onPress}
      className="items-center justify-center"
    >
      <Svg width={190} height={240} viewBox="0 0 150 190" accessible={false}>
        <Ellipse
          cx={75}
          cy={88}
          rx={58}
          ry={76}
          stroke={line}
          strokeWidth={1.2}
          strokeDasharray="4 5"
          fill="none"
        />
        <Path
          d="M50 74c4-4 11-4 15 0M85 74c4-4 11-4 15 0M75 82v18l-5 4h8M62 124c8 6 18 6 26 0"
          stroke={muted}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}
