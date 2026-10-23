import { lookbook } from '@robes/copy';
import { BALANCES, type Balance } from '@robes/core/looks';
import { fonts, Pill, Text } from '@robes/ui-native';
import { View } from 'react-native';

const copy = lookbook.prompt.balance;

// The one question on a new look (legacy 2026-10-19): where its pieces come from. A chip answers
// it; her own words in the field answer it too.
export function BalanceQuestion({
  echo,
  onPick,
  disabled,
}: {
  // Her ask, held while she answers.
  echo?: string;
  onPick: (b: Balance) => void;
  disabled?: boolean;
}) {
  return (
    <View className="gap-2" testID="balance-question">
      {echo ? (
        <Text size="small" tone="muted">
          {echo}
        </Text>
      ) : null}
      <Text className="text-lg" style={{ fontFamily: fonts.display }}>
        {copy.question}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {BALANCES.map((b) => (
          <Pill key={b} disabled={disabled} onPress={() => onPick(b)} testID={`balance-${b}`}>
            {copy[b]}
          </Pill>
        ))}
      </View>
    </View>
  );
}
