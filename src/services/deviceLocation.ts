import * as Location from 'expo-location';

import {
  parseGeoPoint,
  type GeoPoint,
} from '@/src/location';
import { AppError } from '@/src/services/errors';
import { withTimeout } from '@/src/utils/withTimeout';

export type DeviceLocationStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable';

export async function requestDeviceCoordinates(): Promise<GeoPoint> {
  const existing = await Location.getForegroundPermissionsAsync();
  const permission = existing.granted
    ? existing
    : await Location.requestForegroundPermissionsAsync();

  if (!permission.granted) {
    throw new AppError('LOCATION_REQUIRED');
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }),
      12_000,
      new AppError('FAILED'),
    );
    const point = parseGeoPoint(position.coords.latitude, position.coords.longitude);
    if (!point) throw new AppError('VALIDATION');
    return point;
  } catch (caught) {
    if (caught instanceof AppError) throw caught;
    throw new AppError('FAILED', caught);
  }
}

export async function reverseGeocode(point: GeoPoint): Promise<{
  readonly city: string;
  readonly neighborhood: string;
}> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(point.latitude));
  url.searchParams.set('lon', String(point.longitude));
  url.searchParams.set('accept-language', 'ar');

  const response = await withTimeout(
    fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Koupa/1.0 (https://koupa-website.pages.dev)',
      },
    }),
    8_000,
    new AppError('NETWORK'),
  );
  if (!response.ok) throw new AppError('NETWORK');
  const payload = await response.json() as {
    readonly address?: {
      readonly city?: string;
      readonly town?: string;
      readonly village?: string;
      readonly state?: string;
      readonly suburb?: string;
      readonly neighbourhood?: string;
      readonly quarter?: string;
      readonly city_district?: string;
    };
  };
  const address = payload.address ?? {};
  return {
    city: address.city || address.town || address.village || address.state || '',
    neighborhood: address.suburb || address.neighbourhood || address.quarter || address.city_district || '',
  };
}
