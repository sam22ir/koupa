import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar } from 'heroui-native/avatar';
import { Card } from 'heroui-native/card';
import { Typography } from 'heroui-native/text';

import { algeriaDate, formatBookingDate } from '@/src/booking';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import type { RecentBarber } from '@/src/customerHome';
import { colors, space } from '@/src/theme';
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
        <Typography type="body" weight="semibold" align="end">
          {t('home.recentBarbers')}
        </Typography>
        <Typography type="body-xs" color="muted" align="start" className="flex-shrink-1">
          {t('home.recentBarbersHint')}
        </Typography>
      </View>
      <Card className="p-0 overflow-hidden">
        {items.map((item, index) => (
          <View key={item.barberId}>
            {index ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.barberName}، ${t('home.viewProfile')}`}
              onPress={() => onSelect(item.barberId)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Avatar size="md" color="accent">
                <Avatar.Fallback>{initialsFromName(item.barberName)}</Avatar.Fallback>
              </Avatar>
              <View style={styles.copy}>
                <Typography type="body" weight="semibold" align="end">
                  {item.barberName}
                </Typography>
                <Typography type="body-xs" color="muted" align="end">
                  {t('home.lastVisit')} {formatLastVisit(item.lastVisitedAt)}
                </Typography>
              </View>
              <View style={styles.action}>
                <Typography type="body-sm" align="end" style={{ color: colors.primary }}>
                  {t('home.viewProfile')}
                </Typography>
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
  row: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], padding: space[3] },
  pressed: { backgroundColor: colors.background },
  copy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  action: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: space[3] },
});