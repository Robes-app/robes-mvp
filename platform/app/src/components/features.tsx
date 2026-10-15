'use client';

import type { Features } from '@robes/contracts';
import { createContext, type ReactNode, useContext } from 'react';

// The flagged doors, read once per request by the signed-in layout (server/flags.ts).
const FeaturesContext = createContext<Features>({ trips: false });

export function FeaturesProvider({ value, children }: { value: Features; children: ReactNode }) {
  return <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>;
}

export function useFeatures(): Features {
  return useContext(FeaturesContext);
}
