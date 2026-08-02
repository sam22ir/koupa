import { Pressable, StyleSheet, Text, View } from 'react-native';

import { algeriaDate, formatBookingDate } from '@/src/booking';
import { Avatar } from '@/src/components/ui/Avatar';
import { Card } from '@/src/components/ui/Card';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import type { RecentBarber } from '@/src/customerHome';
import { colors, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

type Props = {
  readonly items: readonly RecentBarber[];
  readonly onSelect: (barberId: string) => void;
};

function formatLastVisit(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatBookingDate(algeriaDate(date));
}

export function RecentBarbers({ items, onSelect }: Props) {
  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{t('home.recentBarbers')}</Text>
        <Text style={styles.headingHint}>{t('home.recentBarbersHint')}</Text>
      </View>
      <Card style={styles.card}>
        {items.map((item, index) => (
          <View key={item.barberId}>
            {index ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.barberName}، ${t('home.viewProfile')}`}
              onPress={() => onSelect(item.barberId)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Avatar initials={initialsFromName(item.barberName)} size={42} />
              <View style={styles.copy}>
                <Text style={styles.name}>{item.barberName}</Text>
                <Text style={styles.meta}>
                  {t('home.lastVisit')} {formatLastVisit(item.lastVisitedAt)}
                </Text>
              </View>
              <View style={styles.action}>
                <Text style={styles.actionText}>{t('home.viewProfile')}</Text>
                <Icon name="chevron-back" size={18} color={colors.textMuted} />
              </View>
            </Pressable>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  headingRow: { flexDirection: 'row-reverse', alignItems: 'baseline', justifyContent: 'space-between', gap: space[3] },
  heading: { ...typography.bodyStrong, textAlign: 'right' },
  headingHint: { ...typography.caption, color: colors.textMuted, textAlign: 'left', flexShrink: 1 },
  card: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], padding: space[3] },
  pressed: { backgroundColor: colors.background },
  copy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  name: { ...typography.bodyStrong, textAlign: 'right' },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  action: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  actionText: { ...typography.label, color: colors.primary, textAlign: 'right' },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: space[3] },
});
