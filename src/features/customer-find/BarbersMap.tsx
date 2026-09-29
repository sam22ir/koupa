import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { t } from '@/src/i18n';
import type { GeoPoint } from '@/src/location';
import { colors, radii, space, typography } from '@/src/theme';

import {
  barbersMapHtml,
  MAP_BASE_URL,
  parseMapMessage,
  toScriptJson,
  type MapBounds,
  type MapMarker,
} from './barbersMap';

export interface MapFocusRequest {
  readonly latitude: number;
  readonly longitude: number;
  /** Change this to re-center on the same point twice in a row. */
  readonly nonce: number;
}

/**
 * Interactive map of barbers. The page is drawn once around the starting
 * centre; pins, the selected pin and re-centering are sent in afterwards so the
 * map never reloads while the customer is panning.
 */
export function BarbersMap({
  center,
  markers,
  selectedId,
  focus,
  onSelect,
  onBoundsChange,
}: {
  readonly center: GeoPoint;
  readonly markers: readonly MapMarker[];
  readonly selectedId: string | null;
  readonly focus?: MapFocusRequest | null;
  readonly onSelect: (id: string | null) => void;
  readonly onBoundsChange: (bounds: MapBounds) => void;
}) {
  const webViewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  // The page is built once around the starting centre; later changes go through `focus`.
  const [html] = useState(() => barbersMapHtml(center));

  useEffect(() => {
    if (!ready) return;
    webViewRef.current?.injectJavaScript(`window.setMarkers(${toScriptJson(markers)}); true;`);
  }, [markers, ready]);

  useEffect(() => {
    if (!ready) return;
    webViewRef.current?.injectJavaScript(`window.setSelected(${toScriptJson(selectedId)}); true;`);
  }, [selectedId, markers, ready]);

  useEffect(() => {
    if (!ready || !focus) return;
    webViewRef.current?.injectJavaScript(
      `window.centerOn(${Number(focus.latitude)}, ${Number(focus.longitude)}); true;`,
    );
  }, [focus, ready]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback} testID="barbers-map-fallback">
        <Text style={styles.fallbackText}>{t('find.mapWebFallback')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.frame} testID="barbers-map">
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: MAP_BASE_URL }}
        onMessage={(event) => {
          const message = parseMapMessage(event.nativeEvent.data);
          if (!message) return;
          if (message.type === 'ready') setReady(true);
          else if (message.type === 'select') onSelect(message.id);
          else onBoundsChange(message.bounds);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 320,
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fallback: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceMuted,
    padding: space[5],
  },
  fallbackText: { ...typography.caption, textAlign: 'center' },
});
