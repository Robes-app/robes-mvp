import { useApi } from '@robes/api-client/react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { SelfieCamera } from '@/features/you/SelfieCamera';
import { TwinConsent } from '@/features/you/TwinConsent';

// Full screen and its own chrome: a viewfinder has no room for a header. The camera opens only
// once her yes to the twin is on her account (`photo_analysis`); until then this is the question.
export default function SelfieRoute() {
  const { data: consents } = useApi('me.consents.get');
  if (!consents) return <LoadingScreen />;
  return consents.photo_analysis === true ? <SelfieCamera /> : <TwinConsent />;
}
