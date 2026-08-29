import { Linking, Platform } from 'react-native';
import { parseCoordinatesFromMapsUrl, type GeoPoint } from '@/src/location';

export type NavigationProvider = 'google_maps' | 'yassir' | 'heetch';

export interface NavigationTarget {
  readonly coordinates?: GeoPoint | null;
  readonly mapsUrl?: string | null;
  readonly destinationName?: string | null;
}

export interface ProviderLaunchPlan {
  readonly provider: NavigationProvider;
  readonly primaryUri: string;
  readonly fallbackUri: string;
}

export function resolveAppointmentCoordinates(mapsUrl?: string | null): GeoPoint | null {
  if (!mapsUrl) return null;
  return parseCoordinatesFromMapsUrl(mapsUrl);
}

export function buildGoogleMapsUri(point: GeoPoint): { primaryUri: string; fallbackUri: string } {
  const { latitude, longitude } = point;
  const navigationIntent = `google.navigation:q=${latitude},${longitude}&mode=d`;
  const universalWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return {
    primaryUri: Platform.OS === 'android' ? navigationIntent : universalWebUrl,
    fallbackUri: universalWebUrl,
  };
}

export function buildYassirUri(point: GeoPoint, destinationName?: string | null): { primaryUri: string; fallbackUri: string } {
  const { latitude, longitude } = point;
  const nameParam = destinationName ? `&dropoff_name=${encodeURIComponent(destinationName.trim())}` : '';
  const yassirDeepLink = `yassir://ride?lat=${latitude}&lng=${longitude}${nameParam}`;
  const playStoreUrl = 'market://details?id=com.yassir.client';
  const webPlayStore = 'https://play.google.com/store/apps/details?id=com.yassir.client';

  return {
    primaryUri: yassirDeepLink,
    fallbackUri: Platform.OS === 'android' ? playStoreUrl : webPlayStore,
  };
}

export function buildHeetchUri(point: GeoPoint, destinationName?: string | null): { primaryUri: string; fallbackUri: string } {
  const { latitude, longitude } = point;
  const nameParam = destinationName ? `&dropoff_name=${encodeURIComponent(destinationName.trim())}` : '';
  const heetchDeepLink = `heetch://ride?dropoff_lat=${latitude}&dropoff_lng=${longitude}${nameParam}`;
  const playStoreUrl = 'market://details?id=com.heetch';
  const webPlayStore = 'https://play.google.com/store/apps/details?id=com.heetch';

  return {
    primaryUri: heetchDeepLink,
    fallbackUri: Platform.OS === 'android' ? playStoreUrl : webPlayStore,
  };
}

export function getProviderPlan(
  provider: NavigationProvider,
  target: NavigationTarget,
): ProviderLaunchPlan | null {
  const point = target.coordinates ?? resolveAppointmentCoordinates(target.mapsUrl);

  if (provider === 'google_maps') {
    if (point) {
      return {
        provider,
        ...buildGoogleMapsUri(point),
      };
    }
    if (target.mapsUrl && target.mapsUrl.trim()) {
      return {
        provider,
        primaryUri: target.mapsUrl.trim(),
        fallbackUri: target.mapsUrl.trim(),
      };
    }
    return null;
  }

  if (!point) return null;

  if (provider === 'yassir') {
    return {
      provider,
      ...buildYassirUri(point, target.destinationName),
    };
  }

  if (provider === 'heetch') {
    return {
      provider,
      ...buildHeetchUri(point, target.destinationName),
    };
  }

  return null;
}

export async function launchNavigationProvider(
  provider: NavigationProvider,
  target: NavigationTarget,
): Promise<boolean> {
  const plan = getProviderPlan(provider, target);
  if (!plan) return false;

  try {
    const canOpen = await Linking.canOpenURL(plan.primaryUri);
    if (canOpen) {
      await Linking.openURL(plan.primaryUri);
      return true;
    }
    await Linking.openURL(plan.fallbackUri);
    return true;
  } catch {
    if (plan.fallbackUri && plan.fallbackUri !== plan.primaryUri) {
      try {
        await Linking.openURL(plan.fallbackUri);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}
