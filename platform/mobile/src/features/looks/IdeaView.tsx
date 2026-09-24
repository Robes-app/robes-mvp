import type { Idea, IdeaFrame, IdeaWay } from '@robes/contracts';
import { looks as copy } from '@robes/copy';
import { Button, Eyebrow, Heading, Image, PrimaryScope, Skeleton, Text } from '@robes/ui-native';
import { ScrollView, View } from 'react-native';
import { renditionUri } from '@/lib/images';

function Frame({ frame, title }: { frame: IdeaFrame | undefined; title: string }) {
  const uri = frame?.status === 'ready' ? renditionUri(frame.image, 360) : null;
  if (uri) {
    return (
      <Image source={uri} alt={copy.result.frameAlt(title)} blurhash={frame?.image?.blurhash} />
    );
  }
  // Failed frames stay a quiet blank; one missing image never sinks the look (UX-08).
  if (frame?.status === 'failed') return null;
  return <Skeleton width="100%" aspectRatio={4 / 5} />;
}

function Way({ way, frame }: { way: IdeaWay; frame: IdeaFrame | undefined }) {
  return (
    <View className="gap-3">
      <Frame frame={frame} title={way.title} />
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
}

export function IdeaView({ idea, progress, onSave, saving, onRemove, removing }: IdeaViewProps) {
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
        <Way key={way.title} way={way} frame={idea.frames.find((f) => f.idx === idx)} />
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
