import type { Piece } from '@robes/contracts';
import { lookbook as copy } from '@robes/copy';
import { theName } from '@robes/core/looks';
import { Button, Chip, Image, PrimaryScope, Sheet, Text } from '@robes/ui-native';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { usePieces } from '@/features/wardrobe/pieces';
import { renditionUri } from '@/lib/images';

// The swap drawer (legacy 4b): her pieces by category, opening on the piece's own; a tap picks,
// "Swap in …" commits, closing changes nothing. With no piece to swap it adds one instead.
export function SwapSheet({
  open,
  swapping,
  onRack,
  onClose,
  onPick,
  opensOn = null,
}: {
  open: boolean;
  swapping: { name: string; category: string } | null;
  // Adding from a figure's slot opens on that category when she has pieces in it.
  opensOn?: string | null;
  onRack: readonly string[];
  onClose: () => void;
  onPick: (piece: Piece) => void;
}) {
  const { pieces } = usePieces();
  const ready = pieces.filter((p) => p.status === 'ready' && !onRack.includes(p.id));
  const categories = [...new Set(ready.map((p) => p.category))];
  const [category, setCategory] = useState<string | null>(null);
  const [picked, setPicked] = useState<Piece | null>(null);
  const preset = swapping?.category ?? opensOn;
  const active = category ?? (preset && categories.some((c) => c === preset) ? preset : null);
  const shown = active ? ready.filter((p) => p.category === active) : ready;
  const close = () => {
    setPicked(null);
    setCategory(null);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={
        swapping ? copy.swap.title(theName(swapping.name).replace(/^the /, '')) : copy.swap.add
      }
      testID="swap-sheet"
    >
      <View className="gap-4 pb-6">
        <ScrollView horizontal contentContainerClassName="gap-2">
          <Chip selected={active === null} onPress={() => setCategory(null)}>
            {copy.swap.all}
          </Chip>
          {categories.map((c) => (
            <Chip key={c} selected={active === c} onPress={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </ScrollView>
        {shown.length === 0 ? (
          <Text tone="muted">{copy.swap.empty}</Text>
        ) : (
          <FlatList
            horizontal
            data={shown}
            keyExtractor={(p) => p.id}
            contentContainerClassName="gap-3"
            renderItem={({ item }) => {
              const uri = renditionUri(item.image, 96);
              const on = picked?.id === item.id;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    if (!swapping) {
                      onPick(item);
                      close();
                    } else setPicked(item);
                  }}
                  style={{ width: 96 }}
                  className={`gap-1 rounded-soft border p-1 ${on ? 'border-ink' : 'border-hairline'}`}
                >
                  {uri ? (
                    <Image source={uri} alt="" aspect="3:4" blurhash={item.image?.blurhash} />
                  ) : null}
                  <Text size="caption" numberOfLines={2}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
        {swapping && picked ? (
          <PrimaryScope>
            <Button
              onPress={() => {
                onPick(picked);
                close();
              }}
            >
              {copy.swap.swapIn(picked.label)}
            </Button>
          </PrimaryScope>
        ) : null}
      </View>
    </Sheet>
  );
}
