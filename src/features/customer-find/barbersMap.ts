import type { MapBarber } from '@/src/booking';
import type { GeoPoint } from '@/src/location';
import { colors } from '@/src/theme';

/**
 * OpenStreetMap's tile policy expects a Referer. An inline HTML string sends none,
 * so the WebView is given this base URL and sends it with every tile request.
 */
export const MAP_BASE_URL = 'https://koupa-website.pages.dev/';

export interface MapBounds {
  readonly minLatitude: number;
  readonly minLongitude: number;
  readonly maxLatitude: number;
  readonly maxLongitude: number;
}

export interface MapMarker {
  readonly id: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
}

export type MapMessage =
  | { readonly type: 'ready' }
  | { readonly type: 'bounds'; readonly bounds: MapBounds }
  | { readonly type: 'select'; readonly id: string | null };

/** The viewport must be a real, ordered area on Earth; anything else is dropped. */
export function validBounds(value: unknown): MapBounds | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const { minLatitude, minLongitude, maxLatitude, maxLongitude } = candidate;
  if (
    typeof minLatitude !== 'number' || typeof minLongitude !== 'number'
    || typeof maxLatitude !== 'number' || typeof maxLongitude !== 'number'
    || ![minLatitude, minLongitude, maxLatitude, maxLongitude].every(Number.isFinite)
  ) return null;
  // Zoomed out far enough, Leaflet reports longitudes beyond ±180; clamp them.
  const bounds: MapBounds = {
    minLatitude: Math.max(-90, minLatitude),
    minLongitude: Math.max(-180, minLongitude),
    maxLatitude: Math.min(90, maxLatitude),
    maxLongitude: Math.min(180, maxLongitude),
  };
  if (bounds.minLatitude > bounds.maxLatitude || bounds.minLongitude > bounds.maxLongitude) return null;
  return bounds;
}

/** Parses a message from the map page; unknown or malformed messages are ignored. */
export function parseMapMessage(raw: string): MapMessage | null {
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  const message = payload as Record<string, unknown>;
  if (message.type === 'ready') return { type: 'ready' };
  if (message.type === 'select') {
    return { type: 'select', id: typeof message.id === 'string' ? message.id : null };
  }
  if (message.type === 'bounds') {
    const bounds = validBounds(message.bounds);
    return bounds ? { type: 'bounds', bounds } : null;
  }
  return null;
}

/**
 * Whether the map moved far enough since the last search to offer "search this
 * area": a pan of more than a fifth of the view, or a zoom that changed its size
 * by a quarter.
 */
export function boundsMovedEnough(previous: MapBounds | null, next: MapBounds): boolean {
  if (!previous) return true;
  const latSpan = previous.maxLatitude - previous.minLatitude || 1e-9;
  const lngSpan = previous.maxLongitude - previous.minLongitude || 1e-9;
  const nextLatSpan = next.maxLatitude - next.minLatitude;
  const nextLngSpan = next.maxLongitude - next.minLongitude;
  const panLat = Math.abs((next.minLatitude + next.maxLatitude) - (previous.minLatitude + previous.maxLatitude)) / 2;
  const panLng = Math.abs((next.minLongitude + next.maxLongitude) - (previous.minLongitude + previous.maxLongitude)) / 2;
  return (
    panLat / latSpan > 0.2
    || panLng / lngSpan > 0.2
    || Math.abs(nextLatSpan / latSpan - 1) > 0.25
    || Math.abs(nextLngSpan / lngSpan - 1) > 0.25
  );
}

/** Only what the page needs to draw a pin; nothing else crosses into the WebView. */
export function toMarkers(barbers: readonly MapBarber[]): readonly MapMarker[] {
  return barbers
    .filter((barber) => Number.isFinite(barber.latitude) && Number.isFinite(barber.longitude))
    .map((barber) => ({
      id: barber.id,
      name: barber.name,
      latitude: barber.latitude,
      longitude: barber.longitude,
    }));
}

/** JSON safe to embed in a script string (line separators and `</script>`). */
export function toScriptJson(value: unknown): string {
  const lineSeparator = String.fromCharCode(0x2028);
  const paragraphSeparator = String.fromCharCode(0x2029);
  return JSON.stringify(value)
    .split(lineSeparator).join('\\u2028')
    .split(paragraphSeparator).join('\\u2029')
    .split('<').join('\\u003c');
}

export function barbersMapHtml(center: GeoPoint, zoom = 13): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: ${colors.workspace}; }
    .pin { background: none; border: 0; }
    .pin span {
      display: block; width: 24px; height: 24px; margin: 2px 3px;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      background: ${colors.primary}; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(11,21,21,0.32);
    }
    .pin.selected span { background: ${colors.accent}; transform: rotate(-45deg) scale(1.25); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var markers = {};
    var selected = null;
    function post(payload) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    function pinIcon(isSelected) {
      return L.divIcon({
        className: 'pin' + (isSelected ? ' selected' : ''),
        html: '<span></span>',
        iconSize: [30, 34],
        iconAnchor: [15, 32]
      });
    }
    var map = L.map('map', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], ${zoom});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    function emitBounds() {
      var b = map.getBounds();
      post({ type: 'bounds', bounds: {
        minLatitude: b.getSouth(), minLongitude: b.getWest(),
        maxLatitude: b.getNorth(), maxLongitude: b.getEast()
      } });
    }
    window.setMarkers = function (list) {
      Object.keys(markers).forEach(function (id) { markers[id].remove(); });
      markers = {};
      list.forEach(function (barber) {
        var marker = L.marker([barber.latitude, barber.longitude], {
          icon: pinIcon(barber.id === selected),
          title: barber.name
        }).addTo(map);
        marker.on('click', function () { post({ type: 'select', id: barber.id }); });
        markers[barber.id] = marker;
      });
    };
    window.setSelected = function (id) {
      selected = id;
      Object.keys(markers).forEach(function (key) { markers[key].setIcon(pinIcon(key === id)); });
    };
    window.centerOn = function (lat, lng, zoomLevel) { map.setView([lat, lng], zoomLevel || 14); };
    map.on('moveend', emitBounds);
    map.on('click', function () { post({ type: 'select', id: null }); });
    post({ type: 'ready' });
    emitBounds();
  </script>
</body>
</html>`;
}
