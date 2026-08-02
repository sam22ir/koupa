import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { createQrMatrix } from '@/src/qr';

type QrCodeMatrixProps = {
  readonly value: string;
  readonly size: number;
  readonly foregroundColor: string;
  readonly backgroundColor: string;
  readonly quietZone?: number;
  readonly testID?: string;
};

export function QrCodeMatrix({
  value,
  size,
  foregroundColor,
  backgroundColor,
  quietZone = 0,
  testID,
}: QrCodeMatrixProps) {
  const matrix = useMemo(() => createQrMatrix(value), [value]);
  const moduleSize = (size - quietZone * 2) / matrix.length;
  const surfaceStyle: ViewStyle = {
    width: size,
    height: size,
    padding: quietZone,
    backgroundColor,
  };

  return (
    <View testID={testID} style={[styles.surface, surfaceStyle]} accessibilityLabel="QR code">
      {matrix.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {row.map((dark, columnIndex) => (
            <View
              key={`cell-${rowIndex}-${columnIndex}`}
              style={{
                width: moduleSize,
                height: moduleSize,
                backgroundColor: dark ? foregroundColor : backgroundColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
});
