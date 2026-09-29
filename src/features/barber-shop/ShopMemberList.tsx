import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import { formatMembershipActivity, membershipStatusLabel, type ShopMembership } from '@/src/shops';
import { colors, radii, space, typography } from '@/src/theme';

type Props = {
  readonly members: readonly ShopMembership[];
  readonly pendingRequests?: readonly ShopMembership[];
  readonly onMemberPress?: (member: ShopMembership) => void;
  readonly onRequestAccept?: (member: ShopMembership) => void;
  readonly onRequestReject?: (member: ShopMembership) => void;
  readonly onInvite?: () => void;
  readonly inviteLoading?: boolean;
  readonly showMembershipActivity?: boolean;
  readonly saving?: boolean;
};

function initials(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ح';
}

function MemberRow({
  member,
  onPress,
  showMembershipActivity,
}: {
  readonly member: ShopMembership;
  readonly onPress?: () => void;
  readonly showMembershipActivity: boolean;
}) {
  const secondary = showMembershipActivity
    ? formatMembershipActivity(member)
    : member.barber_phone;
  const content = (
    <View style={styles.row}>
      <Avatar initials={initials(member.barber_name ?? member.barber_id)} size={44} />
      <View style={styles.rowCopy}>
        <Text style={styles.name}>{member.barber_name ?? member.barber_id}</Text>
        {secondary ? <Text style={styles.meta}>{secondary}</Text> : null}
      </View>
      <View style={styles.rowTail}>
        <StatusBadge label={membershipStatusLabel(member.status)} tone={member.status === 'active' ? 'success' : member.status === 'pending' ? 'warning' : 'danger'} />
        {onPress ? <Icon name="chevron-back" size={18} color={colors.textMuted} /> : null}
      </View>
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={member.barber_name ?? member.barber_id}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function ShopMemberList({
  members,
  pendingRequests = [],
  onMemberPress,
  onRequestAccept,
  onRequestReject,
  onInvite,
  inviteLoading,
  showMembershipActivity = false,
  saving,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View testID="shop-members-header" style={styles.sectionHeader}>
        {onInvite ? (
          <Button
            label={t('shopWorkspace.invite')}
            variant="secondary"
            loading={inviteLoading}
            onPress={onInvite}
            style={styles.inviteButton}
          />
        ) : null}
        <Text style={styles.sectionTitle}>{t('shopWorkspace.members')}</Text>
      </View>
      {members.length ? (
        <Card style={styles.listCard}>
          {members.map((member, index) => (
            <View key={member.id}>
              {index ? <View style={styles.divider} /> : null}
              <MemberRow
                member={member}
                showMembershipActivity={showMembershipActivity}
                onPress={onMemberPress ? () => onMemberPress(member) : undefined}
              />
            </View>
          ))}
        </Card>
      ) : (
        <Text style={styles.empty}>{t('shopWorkspace.noMembers')}</Text>
      )}

      {pendingRequests.length ? (
        <View style={styles.requests}>
          <Text style={styles.sectionTitle}>{t('shopWorkspace.requests')}</Text>
          <Card style={styles.listCard}>
            {pendingRequests.map((request, index) => (
              <View key={request.id}>
                {index ? <View style={styles.divider} /> : null}
                <View style={styles.requestRow}>
                  <MemberRow member={request} showMembershipActivity={showMembershipActivity} />
                  <View style={styles.requestActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('shopWorkspace.accept')}
                      disabled={saving}
                      onPress={() => onRequestAccept?.(request)}
                      style={styles.accept}
                    >
                      <Text style={styles.acceptText}>{t('shopWorkspace.accept')}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('shopWorkspace.reject')}
                      disabled={saving}
                      onPress={() => onRequestReject?.(request)}
                      style={styles.reject}
                    >
                      <Text style={styles.rejectText}>{t('shopWorkspace.reject')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  sectionHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  sectionTitle: { ...typography.bodyStrong, textAlign: 'right' },
  inviteButton: { height: 40, minHeight: 40, paddingHorizontal: space[4] },
  listCard: { padding: 0, overflow: 'hidden' },
  row: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: space[3], padding: space[3] },
  pressable: { borderRadius: radii.md },
  pressed: { backgroundColor: colors.background },
  rowCopy: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  name: { ...typography.bodyStrong, textAlign: 'right' },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  rowTail: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: space[3] },
  empty: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  requests: { gap: space[3], marginTop: space[2] },
  requestRow: { gap: space[1] },
  requestActions: { flexDirection: 'row-reverse', gap: space[2], paddingHorizontal: space[3], paddingBottom: space[3] },
  accept: { flex: 1, minHeight: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  reject: { flex: 1, minHeight: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  acceptText: { ...typography.button, color: colors.primary },
  rejectText: { ...typography.button, color: colors.danger },
});
