import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/src/utils/alert';

import {
  canCancelCustomerAppointment,
  formatAppointmentWhen,
  type Appointment,
} from '@/src/booking';
import { splitAppointments, type AppointmentGroups } from '@/src/customerAppointments';
import {
  AppointmentStatusBadge,
  Button,
  EmptyState,
  Icon,
  ErrorBanner,
  Screen,
} from '@/src/components/ui';
import { UpcomingAppointmentCard } from '@/src/features/customer-home/UpcomingAppointmentCard';
import { loadCustomerAppointments, useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { colors, elevation, radii, space, typography } from '@/src/theme';

type AppointmentTab = 'upcoming' | 'past';

const tabs: readonly AppointmentTab[] = ['upcoming', 'past'];

function tabLabel(tab: AppointmentTab): string {
  return tab === 'upcoming' ? t('appointments.upcoming') : t('appointments.past');
}

function emptyCopy(tab: AppointmentTab): string {
  return tab === 'upcoming' ? t('appointments.upcomingEmpty') : t('appointments.pastEmpty');
}

function isUpcoming(item: Appointment): boolean {
  return item.status === 'booked' || item.status === 'present';
}

export default function AppointmentsScreen() {
  const [items, setItems] = useState<readonly Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const hasSelectedTab = useRef(false);
  const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);
  const booking = useBooking();

  const groups = useMemo<AppointmentGroups>(() => splitAppointments(items), [items]);
  const visibleItems = groups[activeTab];
  const showInitialError = !loading && Boolean(error) && !hasLoadedSuccessfully;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadCustomerAppointments();
      const nextGroups = splitAppointments(next);
      setItems(next);
      setHasLoadedSuccessfully(true);
      if (!hasSelectedTab.current && nextGroups.upcoming.length === 0 && nextGroups.past.length > 0) {
        setActiveTab('past');
      }
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const selectTab = (tab: AppointmentTab) => {
    hasSelectedTab.current = true;
    setActiveTab(tab);
  };

  const cancelAppointment = (item: Appointment) => {
    if (!canCancelCustomerAppointment(item.starts_at)) return;
    Alert.alert(t('home.cancelAppt'), t('home.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: () => {
          void booking.cancelCustomer(item.id).then((ok) => {
            if (ok !== false) void refresh();
          });
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <View style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>{t('tabs.appointments')}</Text>
        <View style={styles.tabs} accessibilityRole="tablist">
          {tabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityLabel={tabLabel(tab)}
                accessibilityState={{ selected }}
                onPress={() => selectTab(tab)}
                style={[styles.tab, selected && styles.tabSelected]}
              >
                <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{tabLabel(tab)}</Text>
              </Pressable>
            );
          })}
        </View>

        <ErrorBanner error={error || booking.error} />
        {showInitialError ? (
          <View style={styles.retryWrap}>
            <Button label={t('appointments.retry')} variant="secondary" onPress={() => void refresh()} />
          </View>
        ) : null}

        <View style={styles.listWrap}>
          <FlatList
            data={[...visibleItems]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              showInitialError ? null : loading ? (
                <ActivityIndicator style={styles.initialLoader} color={colors.primary} />
              ) : (
                <EmptyState
                  title={emptyCopy(activeTab)}
                  icon="calendar-clear-outline"
                  actionLabel={activeTab === 'upcoming' ? t('home.findCta') : undefined}
                  onAction={activeTab === 'upcoming' ? () => router.push('/(customer)/find') : undefined}
                />
              )
            }
            ListFooterComponent={loading && visibleItems.length > 0 ? <ActivityIndicator color={colors.primary} /> : null}
            renderItem={({ item }) => (
              <AppointmentCard
                item={item}
                upcoming={isUpcoming(item)}
                onCancel={() => cancelAppointment(item)}
              />
            )}
          />
        </View>
      </View>
    </Screen>
  );
}

function AppointmentCard({
  item,
  upcoming,
  onCancel,
}: {
  readonly item: Appointment;
  readonly upcoming: boolean;
  readonly onCancel: () => void;
}) {
  const openDetails = () => router.push(`/appointment/${item.id}`);

  if (upcoming) {
    return (
      <UpcomingAppointmentCard
        appointment={item}
        onManage={openDetails}
        onScan={() => router.push({ pathname: '/scan', params: { appointmentId: item.id, barberName: item.barber_name, startsAt: item.starts_at } })}
        onReschedule={() => router.push({
          pathname: '/book/[barberId]',
          params: {
            barberId: item.barber_id,
            appointmentId: item.id,
            serviceId: item.service_id,
            returnTo: `/appointment/${item.id}`,
          },
        })}
        onCancel={onCancel}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.service_name}، ${t('appointments.openDetails')}`}
      onPress={openDetails}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.service} numberOfLines={2}>{item.service_name}</Text>
        <AppointmentStatusBadge status={item.status} />
      </View>
      <Text style={styles.meta} numberOfLines={1}>
        {[item.barber_name ?? '—', item.shop_name].filter(Boolean).join(' · ')}
      </Text>
      <View style={styles.whenRow}>
        <View style={styles.when}>
          <Icon name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={styles.whenText}>{formatAppointmentWhen(item.starts_at)}</Text>
        </View>
        <Icon name="chevron-back" size={18} color={colors.textSubtle} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: space[5],
    paddingTop: space[2],
    gap: space[3],
  },
  title: { ...typography.title, textAlign: 'right' },
  tabs: {
    flexDirection: 'row-reverse',
    gap: space[1],
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: space[1],
  },
  tab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  tabSelected: {
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  tabText: {
    ...typography.label,
    color: colors.textMuted,
  },
  tabTextSelected: {
    color: colors.primarySoftText,
  },
  retryWrap: {
    gap: space[2],
  },
  listWrap: {
    flex: 1,
  },
  initialLoader: {
    marginTop: space[8],
  },
  list: {
    gap: space[3],
    paddingTop: space[1],
    paddingBottom: space[8],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space[4],
    gap: space[2],
    ...elevation.card,
  },
  cardPressed: {
    backgroundColor: colors.primarySoft,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space[2],
  },
  service: {
    ...typography.bodyStrong,
    textAlign: 'right',
    flex: 1,
  },
  meta: {
    ...typography.caption,
    textAlign: 'right',
  },
  whenRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space[1],
    paddingTop: space[2],
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  when: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  whenText: { ...typography.label, color: colors.text },
});
