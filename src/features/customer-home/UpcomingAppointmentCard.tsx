import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from 'heroui-native/button';
import { Card } from 'heroui-native/card';
import { Chip } from 'heroui-native/chip';
import { Typography } from 'heroui-native/text';

import {
  algeriaDate,
  appointmentStatusLabel,
  formatBookingDate,
  formatBookingTime,
  type Appointment,
} from '@/src/booking';
import { DirectionsModal } from '@/src/components/navigation/DirectionsModal';
import { t } from '@/src/i18n';
import { colors, radii, space } from '@/src/theme';

import {
  appointmentOverflowActions,
  appointmentPrimaryKind,
} from './appointmentFirstView';

type Props = {
  readonly appointment: Appointment;
  readonly onManage: () => void;
  readonly onScan: () => void;
  readonly onReschedule: () => void;
  readonly onCancel: () => void;
  readonly onDirections?: () => void;
  readonly compact?: boolean;
};

export function UpcomingAppointmentCard({
  appointment,
  onManage,
  onScan,
  onReschedule,
  onCancel,
  onDirections,
  compact = false,
}: Props) {
  const status = appointmentStatusLabel(appointment.status);
  const [directionsVisible, setDirectionsVisible] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const primary = appointmentPrimaryKind(appointment, now);
  const overflow = appointmentOverflowActions(appointment, now);
  const handleDirections = onDirections ?? (() => setDirectionsVisible(true));

  return (
    <Card className="p-4 gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${appointment.service_name}، ${t('home.details')}`}
        onPress={onManage}
        style={({ pressed }) => [styles.summary, pressed && styles.summaryPressed]}
      >
        <View style={styles.summaryTop}>
          <Chip size="sm" variant="soft" color="accent">
            <Chip.Label>{status}</Chip.Label>
          </Chip>
          <Typography type="body-xs" color="muted" align="end">
            {formatBookingDate(algeriaDate(new Date(appointment.starts_at)))}
          </Typography>
        </View>
        <Typography type="h5" align="end" numberOfLines={2}>
          {appointment.service_name}
        </Typography>
        <View style={styles.personCopy}>
          <Typography type="body" weight="semibold" align="end">
            {appointment.barber_name ?? '—'}
          </Typography>
          {appointment.shop_name ? (
            <Typography type="body-xs" color="muted" align="end">
              {appointment.shop_name}
            </Typography>
          ) : null}
        </View>
        <View style={styles.facts}>
          <Fact label={t('common.time')} value={formatBookingTime(appointment.starts_at)} />
          <Fact
            label={t('common.price')}
            value={`${appointment.price_dzd.toLocaleString('ar-DZ')} ${t('common.dzd')}`}
          />
        </View>
      </Pressable>

      <Button onPress={primary === 'scan' ? onScan : onManage}>
        <Button.Label>{primary === 'scan' ? t('home.scanQr') : t('home.details')}</Button.Label>
      </Button>

      {overflow.length && !compact ? (
        <Button variant="ghost" onPress={() => setMoreOpen((open) => !open)}>
          <Button.Label>{moreOpen ? t('home.hideActions') : t('home.moreActions')}</Button.Label>
        </Button>
      ) : null}

      {moreOpen ? (
        <View style={styles.overflow}>
          {overflow.includes('directions') ? (
            <Button variant="secondary" onPress={handleDirections}>
              <Button.Label>{t('directions.action')}</Button.Label>
            </Button>
          ) : null}
          {overflow.includes('reschedule') ? (
            <Button variant="secondary" onPress={onReschedule}>
              <Button.Label>{t('home.rescheduleAction')}</Button.Label>
            </Button>
          ) : null}
          {overflow.includes('cancel') ? (
            <Button variant="danger" onPress={onCancel}>
              <Button.Label>{t('home.cancelAppt')}</Button.Label>
            </Button>
          ) : null}
        </View>
      ) : null}

      <DirectionsModal
        visible={directionsVisible}
        onClose={() => setDirectionsVisible(false)}
        mapsUrl={appointment.location_maps_url}
        destinationName={appointment.shop_name || appointment.barber_name}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  summary: { gap: space[3], padding: space[1], borderRadius: radii.lg },
  summaryPressed: { backgroundColor: colors.primarySoft },
  summaryTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  personCopy: { alignItems: 'flex-end', gap: 2 },
  facts: {
    flexDirection: 'row-reverse',
    gap: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[3],
  },
  fact: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  overflow: { gap: space[2] },
});

function Fact({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={styles.fact}>
      <Typography type="body-xs" color="muted" align="end">
        {label}
      </Typography>
      <Typography type="body" weight="semibold" align="end">
        {value}
      </Typography>
    </View>
  );
}