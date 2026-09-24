import type { Idea, IdeaFrame, IdeaWay } from '@robes/contracts';
import { looks as copy } from '@robes/copy';
import { Button, Eyebrow, Heading, Image, PrimaryScope, Skeleton, Text } from '@robes/ui-native';
import { ScrollView, View } from 'react-native';
import { renditionUri } from '@/lib/images';

function Frame({
  frame,
  title,
  onShow,
  showing,
}: {
  frame: IdeaFrame | undefined;
  title: string;
  onShow: () => void;
  showing: boolean;
}) {
  const uri = frame?.status === 'ready' ? renditionUri(frame.image, 360) : null;
  if (uri) {
    return (
      <Image source={uri} alt={copy.result.frameAlt(title)} blurhash={frame?.image?.blurhash} />
    );
  }
  // Only the first look is pictured up front; the rest (or a failed one) when she asks (UX-09).
  if (frame?.status === 'deferred' || frame?.status === 'failed') {
    return (
      <View className="aspect-[4/5] w-full items-center justify-center rounded-crisp border border-hairline">
        <Button
          variant="quiet"
          onPress={onShow}
          loading={showing}
          loadingLabel={copy.result.showLook}
          accessibilityHint={title}
        >
          {copy.result.showLook}
        </Button>
      </View>
    );
  }
  return <Skeleton width="100%" aspectRatio={4 / 5} />;
}

function Way({
  way,
  frame,
  onSave,
  saving,
  onShow,
  showing,
}: {
  way: IdeaWay;
  frame: IdeaFrame | undefined;
  onSave: () => void;
  saving: boolean;
  onShow: () => void;
  showing: boolean;
}) {
  return (
    <View className="gap-3">
      <Frame frame={frame} title={way.title} onShow={onShow} showing={showing} />
      <Eyebrow>{way.eyebrow}</Eyebrow>
      <Heading size="md">{way.title}</Heading>
      <Text>{way.outfit}</Text>
      {way.details ? (
        <View className="gap-1">
          <Text size="caption" tone="muted">
            {copy.result.details}
          </Text>
          <Text>{way.details}</Text>
        </View>
      ) : null}
      {way.accessories ? (
        <View className="gap-1">
          <Text size="caption" tone="muted">
            {copy.result.accessories}
          </Text>
          <Text>{way.accessories}</Text>
        </View>
      ) : null}
      <Button
        variant="secondary"
        onPress={onSave}
        loading={saving}
        loadingLabel={copy.saveWay}
        accessibilityHint={way.title}
      >
        {copy.saveWay}
      </Button>
    </View>
  );
}

export interface IdeaViewProps {
  idea: Idea;
  // Shown above the looks while frames are still arriving.
  progress?: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  onRemove: () => void;
  removing: boolean;
  onSaveWay: (wayIdx: number) => void;
  // The way being saved as a look, if any.
  savingWay: number | null;
  onShowFrame: (idx: number) => void;
  showingFrame: number | null;
}

export function IdeaView({
  idea,
  progress,
  onSave,
  saving,
  onRemove,
  removing,
  onSaveWay,
  savingWay,
  onShowFrame,
  showingFrame,
}: IdeaViewProps) {
  const saved = idea.savedAt !== null;
  return (
    <ScrollView contentContainerClassName="gap-8 px-6 pb-12">
      <View className="gap-2">
        <Eyebrow>{copy.result.eyebrow}</Eyebrow>
        <Heading>{idea.title}</Heading>
        {idea.fallback ? <Text tone="muted">{copy.result.fallback}</Text> : null}
      </View>
      {progress}
      {idea.ways.map((way, idx) => (
        <Way
          key={way.title}
          way={way}
          frame={idea.frames.find((f) => f.idx === idx)}
          onSave={() => onSaveWay(idx)}
          saving={savingWay === idx}
          onShow={() => onShowFrame(idx)}
          showing={showingFrame === idx}
        />
      ))}
      <PrimaryScope>
        <View className="gap-3">
          <Button
            onPress={onSave}
            disabled={saved}
            loading={saving}
            loadingLabel={copy.result.save}
          >
            {saved ? copy.result.saved : copy.result.save}
          </Button>
          <Button
            variant="quiet"
            icon="trash"
            onPress={onRemove}
            loading={removing}
            className="self-center"
          >
            {copy.result.remove}
          </Button>
        </View>
      </PrimaryScope>
    </ScrollView>
  );
}
