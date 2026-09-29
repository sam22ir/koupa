import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/src/components/ui';
import { formatDistanceKm } from '@/src/location';
import { t } from '@/src/i18n';
import { colors, elevation, radii, space, typography } from '@/src/theme';

import { directoryRatingText } from './directoryRating';

type Props = {
  readonly title: string;
  readonly meta?: string;
  readonly average: number | null | undefined;
  readonly distanceKm?: number | null;
  readonly startingPrice?: number;
  readonly onPress: () => void;
  readonly testID?: string;
};

/** One directory result: barbers, shops and the map preview all share it. */
export function DirectoryCard({ title, meta, average, distanceKm, startingPrice, onPress, testID }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}، ${t('find.viewDetails')}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.top}>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        </View>
        <Icon name="chevron-back" size={18} color={colors.textSubtle} />
      </View>
      <View style={styles.footer}>
        <RatingPill average={average} />
        {distanceKm != null ? (
          <View style={styles.distance}>
            <Icon name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta}>{formatDistanceKm(distanceKm)}</Text>
          </View>
        ) : null}
        {startingPrice != null ? (
          <Text style={styles.price}>
            <Text style={styles.priceLead}>{t('find.fromPrice')} </Text>
            {startingPrice} {t('common.dzd')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Amber pill for a real score; a plain muted line when there is none (never "0.0"). */
export function RatingPill({ average }: { readonly average: number | null | undefined }) {
  const text = directoryRatingText(average, t('find.noRatings'));
  if (text === t('find.noRatings')) return <Text style={styles.noRating}>{text}</Text>;
  return (
    <View style={styles.ratingPill}>
      <Icon name="star" size={12} color={colors.accent} />
      <Text style={styles.rating}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space[4],
    ...elevation.card,
  },
  pressed: { backgroundColor: colors.primarySoft },
  top: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: space[1] },
  title: { ...typography.bodyStrong, width: '100%', textAlign: 'right' },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  footer: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  distance: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  ratingPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[1],
    minHeight: 24,
    paddingHorizontal: space[2],
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  rating: { ...typography.label, fontSize: 12, lineHeight: 18, color: colors.accentText },
  noRating: { ...typography.caption, color: colors.textSubtle },
  price: { ...typography.numeric, fontSize: 14, marginStart: 'auto', flexShrink: 1 },
  priceLead: { ...typography.caption, color: colors.textMuted },
});
