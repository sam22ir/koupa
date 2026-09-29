import type { Href } from 'expo-router';

import { destinationHref } from './paths';
import type { AppDestination } from './resolveRoute';

/**
 * Choose the first screen for a cold app launch. A signed-out visitor always
 * lands on the single welcome screen; every other destination follows the
 * session decision unchanged.
 */
export function resolveStartupHref(destination: AppDestination): Href | null {
  if (destination === 'loading') return null;
  return destinationHref(destination);
}
