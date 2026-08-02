import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { t } from '@/src/i18n';
import { formatMembershipActivity, membershipStatusLabel, type ShopMembership } from '@/src/shops';
import { colors, space, typography } from '@/src/theme';

type Props = {
  readonly member: ShopMembership;
  readonly onRemove: () => void;
  readonly saving?: boolean;
};

function initials(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ح';
}

export function ShopMemberSummary({ member, onRemove, saving }: Props) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={styles.name}>{member.barber_name ?? member.barber_id}</Text>
            {member.barber_phone ? <Text style={styles.meta}>{member.barber_phone}</Text> : null}
          </View>
          <Avatar initials={initials(member.barber_name ?? member.barber_id)} size={58} />
        </View>
        <View style={styles.statusRow}>
          <Chip label={membershipStatusLabel(member.status)} tone="primary" />
          <Text style={styles.meta}>{t('shopWorkspace.active')}</Text>
        </View>
        <Text style={styles.activity}>{formatMembershipActivity(member)}</Text>
      </Card>
      <Button
        label={t('shopWorkspace.removeMember')}
        variant="danger"
        loading={saving}
        onPress={onRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  card: { gap: space[4] },
  header: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  copy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  name: { ...typography.titleSm, textAlign: 'right' },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  statusRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  activity: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
});
