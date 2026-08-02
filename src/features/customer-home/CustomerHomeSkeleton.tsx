import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '@/src/theme';

export function CustomerHomeSkeleton() {
  return (
    <View testID="customer-home-skeleton" style={styles.wrap}>
      <View style={styles.primaryCard}>
        <View style={styles.icon} />
        <View style={styles.heading} />
        <View style={styles.body} />
        <View style={styles.button} />
      </View>
      <View style={styles.recentCard}>
        <View style={styles.sectionHeading} />
        <View style={styles.row} />
        <View style={styles.row} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  primaryCard: { gap: space[3], padding: space[4], borderRadius: radii['2xl'], backgroundColor: colors.surface },
  icon: { width: 52, height: 52, alignSelf: 'flex-end', borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  heading: { width: '62%', height: 20, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  body: { width: '82%', height: 14, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  button: { width: '100%', height: 48, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  recentCard: { gap: space[3], padding: space[4], borderRadius: radii['2xl'], backgroundColor: colors.surface },
  sectionHeading: { width: '54%', height: 18, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  row: { width: '100%', height: 54, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
});
