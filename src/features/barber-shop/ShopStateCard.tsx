import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Chip } from '@/src/components/ui/Chip';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import { membershipStatusLabel, type ShopMembership, type ShopRelationship } from '@/src/shops';
import { colors, layout, radii, space, typography } from '@/src/theme';

type Action = {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly loading?: boolean;
};

type Metric = {
  readonly label: string;
  readonly value: string;
};

type Props = {
  readonly kind: ShopRelationship['kind'] | 'owner';
  readonly shopName?: string | null;
  readonly shopLocation?: string | null;
  readonly membership?: ShopMembership | null;
  readonly primaryAction?: Action;
  readonly secondaryAction?: Action;
  readonly title?: string;
  readonly body?: string;
  readonly expiryLabel?: string;
  readonly metrics?: readonly Metric[];
};

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'م';
}

function defaultTitle(kind: Props['kind']): string {
  switch (kind) {
    case 'request':
      return t('shopWorkspace.pending');
    case 'invitation':
      return t('shopWorkspace.invitation');
    case 'member':
      return t('shopWorkspace.active');
    case 'owner':
      return t('shopWorkspace.owner');
    default:
      return t('shopWorkspace.unaffiliatedSubtitle');
  }
}

function defaultBody(kind: Props['kind']): string {
  switch (kind) {
    case 'request':
      return t('shopWorkspace.pendingBody');
    case 'invitation':
      return t('shopWorkspace.invitationBody');
    case 'member':
      return t('shopWorkspace.memberBody');
    case 'owner':
      return '';
    default:
      return '';
  }
}

export function ShopStateCard({
  kind,
  shopName,
  shopLocation,
  membership,
  primaryAction,
  secondaryAction,
  title,
  body,
  expiryLabel,
  metrics,
}: Props) {
  const displayName = shopName || membership?.shop_name;
  return (
    <Card style={styles.card} accessibilityLabel={title ?? defaultTitle(kind)}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{title ?? defaultTitle(kind)}</Text>
          {displayName ? <Text style={styles.shopName}>{displayName}</Text> : null}
          {shopLocation ? (
            <View style={styles.metaRow}>
              <Icon name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.meta}>{shopLocation}</Text>
            </View>
          ) : null}
        </View>
        {kind !== 'owner' && kind !== 'none' ? (
          <Avatar initials={initials(displayName ?? t('brand'))} size={52} />
        ) : null}
      </View>

      {membership ? (
        <View style={styles.statusRow}>
          <Chip
            label={membershipStatusLabel(membership.status)}
            tone={membership.status === 'active' ? 'primary' : 'accent'}
          />
          {expiryLabel ? <Text style={styles.expiry}>{expiryLabel}</Text> : null}
        </View>
      ) : null}

      {metrics?.length ? (
        <View style={styles.metrics} accessibilityRole="summary">
          {metrics.map((metric) => (
            <View key={metric.label} testID={`shop-metric-${metric.label}`} style={styles.metric}>
              <Text style={styles.metricLabel} numberOfLines={1}>{metric.label}</Text>
              <Text style={styles.metricValue} numberOfLines={1}>{metric.value}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {body ?? defaultBody(kind) ? (
        <Text style={styles.body}>{body ?? defaultBody(kind)}</Text>
      ) : null}

      {primaryAction || secondaryAction ? (
        <View style={styles.actions}>
          {primaryAction ? (
            <Button
              label={primaryAction.label}
              onPress={primaryAction.onPress}
              disabled={primaryAction.disabled}
              loading={primaryAction.loading}
              style={styles.action}
            />
          ) : null}
          {secondaryAction ? (
            <Button
              label={secondaryAction.label}
              variant="secondary"
              onPress={secondaryAction.onPress}
              disabled={secondaryAction.disabled}
              loading={secondaryAction.loading}
              style={styles.action}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[4], padding: layout.cardPadding },
  headingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[3],
  },
  headingCopy: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  title: { ...typography.titleSm, textAlign: 'right' },
  shopName: { ...typography.bodyStrong, textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  meta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  statusRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  expiry: { ...typography.caption, color: colors.textMuted, textAlign: 'right', flexShrink: 1 },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'right', lineHeight: 24 },
  metrics: { flexDirection: 'row-reverse', gap: space[2] },
  metric: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[1],
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space[2],
  },
  metricValue: { ...typography.bodyStrong, color: colors.primary, textAlign: 'center', flexShrink: 1 },
  metricLabel: { ...typography.caption, color: colors.primary, textAlign: 'center', flexShrink: 1 },
  actions: { gap: space[2] },
  action: { minWidth: 150 },
});
