export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export const ALGIERS_CENTER: GeoPoint = {
  latitude: 36.7538,
  longitude: 3.0588,
};

export const DEFAULT_NEARBY_RADIUS_KM = 25;
export const MAX_NEARBY_RADIUS_KM = 100;

export function parseCoordinate(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGeoPoint(
  latitude: string | number | null | undefined,
  longitude: string | number | null | undefined,
): GeoPoint | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function serializeGeoPoint(point: GeoPoint): { readonly latitude: string; readonly longitude: string } {
  return {
    latitude: point.latitude.toFixed(6),
    longitude: point.longitude.toFixed(6),
  };
}

export function mapsUrlFromCoordinates(point: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
}

export function parseCoordinatesFromMapsUrl(value: string): GeoPoint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const query = url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
    const queryMatch = query.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (queryMatch) return parseGeoPoint(queryMatch[1], queryMatch[2]);
    const atMatch = `${url.pathname}${url.hash}`.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) return parseGeoPoint(atMatch[1], atMatch[2]);
    const pathMatch = url.pathname.match(/\/search\/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (pathMatch) return parseGeoPoint(pathMatch[1], pathMatch[2]);
    return null;
  } catch {
    return null;
  }
}

export function haversineKm(from: GeoPoint, to: GeoPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(km: number): string {
  if (!Number.isFinite(km) || km < 0) return '';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} م`;
  const rounded = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `${rounded} كم`;
}

const googleMapsHosts = new Set(['google.com', 'maps.google.com', 'www.google.com']);

export function isValidMapsUrl(value: string): boolean {
  if (parseCoordinatesFromMapsUrl(value)) return true;
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase();
    const hasShortLinkPath = host === 'goo.gl' && url.pathname.length > 1;
    const isGoogleMapsHost = googleMapsHosts.has(host) && url.pathname.includes('/maps');
    return (
      url.protocol === 'https:'
      && (host === 'maps.app.goo.gl' || hasShortLinkPath || isGoogleMapsHost)
    );
  } catch {
    return false;
  }
}

export function hasUsableLocation(input: {
  readonly mapsUrl?: string;
  readonly latitude?: string;
  readonly longitude?: string;
}): boolean {
  return Boolean(parseGeoPoint(input.latitude, input.longitude) || (input.mapsUrl && isValidMapsUrl(input.mapsUrl)));
}
