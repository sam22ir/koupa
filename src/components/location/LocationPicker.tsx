import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { Button, Card, Icon } from '@/src/components/ui';
import { t } from '@/src/i18n';
import {
  ALGIERS_CENTER,
  mapsUrlFromCoordinates,
  parseGeoPoint,
  serializeGeoPoint,
  type GeoPoint,
} from '@/src/location';
import { requestDeviceCoordinates, reverseGeocode } from '@/src/services/deviceLocation';
import { colors, radii, space, typography } from '@/src/theme';

export type LocationSelection = {
  readonly latitude: string;
  readonly longitude: string;
  readonly mapsUrl: string;
  readonly city?: string;
  readonly neighborhood?: string;
};

type Props = {
  readonly latitude?: string;
  readonly longitude?: string;
  readonly onChange: (next: LocationSelection) => void;
};

function leafletHtml(center: GeoPoint): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; background: #dce9ea; }
    .center-pin {
      position: absolute; left: 50%; top: 50%;
      width: 22px; height: 22px; margin: -28px 0 0 -11px;
      border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
      background: #1A7A78; border: 3px solid #fff; z-index: 500;
      box-shadow: 0 2px 8px rgba(15,28,34,0.28);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="center-pin"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true }).setView([${center.latitude}, ${center.longitude}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    function emit() {
      const c = map.getCenter();
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: c.lat, longitude: c.lng }));
      }
    }
    map.on('moveend', emit);
    emit();
    window.centerOn = function(lat, lng) { map.setView([lat, lng], 16); };
  </script>
</body>
</html>`;
}

export function LocationPicker({ latitude, longitude, onChange }: Props) {
  const selected = parseGeoPoint(latitude, longitude);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<GeoPoint>(selected ?? ALGIERS_CENTER);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  const html = useMemo(() => leafletHtml(draft), [draft]);

  const applyPoint = async (point: GeoPoint, closeModal: boolean) => {
    setBusy(true);
    setError(null);
    const serialized = serializeGeoPoint(point);
    let city: string | undefined;
    let neighborhood: string | undefined;
    try {
      const place = await reverseGeocode(point);
      city = place.city || undefined;
      neighborhood = place.neighborhood || undefined;
    } catch {
      // Coordinates are enough; city/neighborhood stay optional extras.
    }
    onChange({
      ...serialized,
      mapsUrl: mapsUrlFromCoordinates(point),
      city,
      neighborhood,
    });
    setDraft(point);
    setBusy(false);
    if (closeModal) setOpen(false);
  };

  const requestGps = async (fromModal: boolean) => {
    setLocating(true);
    setError(null);
    try {
      const point = await requestDeviceCoordinates();
      setDraft(point);
      if (fromModal) {
        webViewRef.current?.injectJavaScript(`window.centerOn(${point.latitude}, ${point.longitude}); true;`);
      } else {
        await applyPoint(point, false);
      }
    } catch {
      setError(t('location.permissionDenied'));
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Card style={styles.summary}>
        <View style={styles.summaryCopy}>
          <Text style={styles.label}>{t('location.title')}</Text>
          <Text style={styles.body}>
            {selected ? t('location.selected') : t('location.empty')}
          </Text>
          {selected ? (
            <Text style={styles.coords}>
              {selected.latitude.toFixed(5)}، {selected.longitude.toFixed(5)}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button
            label={t('location.pickOnMap')}
            onPress={() => {
              setDraft(selected ?? ALGIERS_CENTER);
              setError(null);
              setOpen(true);
            }}
          />
          <Button
            label={t('location.useCurrent')}
            variant="secondary"
            loading={locating && !open}
            onPress={() => void requestGps(false)}
          />
        </View>
      </Card>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('location.pickOnMap')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={() => setOpen(false)}
              style={styles.close}
            >
              <Icon name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <Text style={styles.hint}>{t('location.mapHint')}</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.webFallback}>
              <Text style={styles.body}>{t('location.webFallback')}</Text>
            </View>
          ) : (
            <View style={styles.mapFrame}>
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html }}
                onMessage={(event) => {
                  try {
                    const payload = JSON.parse(event.nativeEvent.data) as GeoPoint;
                    const point = parseGeoPoint(payload.latitude, payload.longitude);
                    if (point) setDraft(point);
                  } catch {
                    // Ignore malformed map events.
                  }
                }}
              />
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.modalActions}>
            <Button
              label={t('location.useCurrent')}
              variant="secondary"
              loading={locating}
              onPress={() => void requestGps(true)}
            />
            <Button
              label={t('location.confirm')}
              loading={busy}
              onPress={() => void applyPoint(draft, true)}
            />
          </View>
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  summary: { gap: space[4] },
  summaryCopy: { gap: space[1], alignItems: 'flex-end' },
  label: { ...typography.bodyStrong, textAlign: 'right' },
  body: { ...typography.caption, textAlign: 'right' },
  coords: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  actions: { gap: space[2] },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: space[10],
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    gap: space[3],
  },
  modalHeader: {
    minHeight: 48,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...typography.titleSm, flex: 1, textAlign: 'right' },
  close: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  hint: { ...typography.caption, textAlign: 'right' },
  mapFrame: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    padding: space[5],
  },
  modalActions: { gap: space[2] },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
});
