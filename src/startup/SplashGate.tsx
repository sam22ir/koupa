import { usePathname } from 'expo-router';
import { useEffect } from 'react';

import { useAppSession } from '@/src/providers/SessionProvider';

import { hideSplash, isFirstScreenReady } from './splash';

/** Hides the native splash when the first real screen is ready. Renders nothing. */
export function SplashGate() {
  const { loading } = useAppSession();
  const pathname = usePathname();

  useEffect(() => {
    if (isFirstScreenReady({ loading, pathname })) hideSplash();
  }, [loading, pathname]);

  return null;
}
