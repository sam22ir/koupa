import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BarberProfile } from '@/src/booking';
import {
  Avatar,
  BackButton,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Icon,
  OptionCard,
  Screen,
  SectionHeader,
  Stage,
} from '@/src/components/ui';
import { initialsFromName } from '@/src/utils/initials';
import { useBooking } from '@/src/hooks/useBooking';
import { useJoinQueue, usePublicQueueStatus } from '@/src/hooks/useQueue';
import { JoinQueueCard } from '@/src/features/customer-queue/JoinQueueCard';
import { UgcModerationActions } from '@/src/features/moderation/UgcModerationActions';
import { useAppSession } from '@/src/providers/SessionProvider';
import { t } from '@/src/i18n';
import { publicProfileReturnHref } from '@/src/navigation/bookingNavigation';
import { setPendingIntentFromPath } from '@/src/navigation/pendingIntent';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';
import { weeklyHoursRows } from '@/src/features/customer-find/weeklyHours';
import { isUserBlocked } from '@/src/services/ugcModeration';

export default function BarberProfilePublicScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { getBarber, loading, error } = useBooking();
  const { profile, guestBrowsing } = useAppSession();
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const { status: queueStatus } = usePublicQueueStatus(id);
  const joinQueue = useJoinQueue();
  const fallback = publicProfileReturnHref(returnTo, guestBrowsing ? 'customer' : profile?.role);

  const load = useCallback(async () => {
    if (!id) return;
    const isBlocked = await isUserBlocked(id).catch(() => false);
    setBlocked(isBlocked);
    if (isBlocked) {
      setBarber(null);
      setSelectedServiceId(null);
      return;
    }
    const rows = await getBarber(id);
    setBarber(rows?.[0] ?? null);
    setSelectedServiceId(null);
  }, [getBarber, id]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
    // Reload only when the route id changes; hook identity churn must not
    // restart the load and clear the visitor's in-progress service selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startBooking = (barberId: string, serviceId: string) => {
    const returnPath = `/barber/${barberId}`;
    if (profile?.role === 'customer' || guestBrowsing) {
      router.push({
        pathname: '/book/[barberId]',
        params: { barberId, serviceId, returnTo: returnPath },
      });
      return;
    }
    if (profile?.role !== 'barber') {
      setPendingIntentFromPath(`/book/${barberId}`, { serviceId, returnTo: returnPath });
      router.push({ pathname: '/(auth)/sign-up', params: { role: 'customer' } });
    }
  };

  const isGuest = guestBrowsing || !profile;
  const onJoinQueue = async () => {
    if (!barber) return;
    if (isGuest) {
      setPendingIntentFromPath(`/barber/${barber.id}`, {});
      router.push({ pathname: '/(auth)/sign-up', params: { role: 'customer' } });
      return;
    }
    if (!selectedServiceId) return;
    // The line lives on Home, where the customer's position is shown.
    if (await joinQueue.join(barber.id, selectedServiceId)) router.replace('/(customer)/home');
  };

  const selectedService = barber?.services.find((service) => service.id === selectedServiceId) ?? null;
  const canBook = profile?.role !== 'barber' && Boolean(selectedService);
  const showBook = Boolean(barber && !blocked && profile?.role !== 'barber' && barber.services.length);

  return (
    <Screen
      padded={false}
      scroll
      bleedTop
      footer={showBook && barber ? (
        <View style={styles.footerRow}>
          {selectedService ? (
            <View style={styles.footerSummary}>
              <Text numberOfLines={1} style={styles.footerCaption}>{selectedService.name}</Text>
              <Text style={styles.footerPrice}>{`${selectedService.price_dzd} ${t('common.dzd')}`}</Text>
            </View>
          ) : (
            <Text style={[styles.footerCaption, styles.footerHint]}>{t('booking.chooseService')}</Text>
          )}
          <Button
            label={t('booking.book')}
            disabled={!canBook}
            style={styles.footerButton}
            onPress={() => {
              if (selectedService) startBooking(barber.id, selectedService.id);
            }}
          />
        </View>
      ) : undefined}
    >
      <Stage overlap>
        <View style={styles.backRow}>
          <BackButton fallback={fallback} tone="onPrimary" />
        </View>
        {barber && !blocked ? (
          <View style={styles.identityRow}>
            <Avatar initials={initialsFromName(barber.name)} size={64} tone="stage" />
            <View style={styles.identityCopy}>
              <Text accessibilityRole="header" style={styles.identityName}>{barber.name}</Text>
              {[barber.neighborhood, barber.city].filter(Boolean).length ? (
                <View style={styles.metaRow}>
                  <Icon name="location-outline" size={14} color={colors.onPrimaryMuted} />
                  <Text style={styles.identityLocation}>{[barber.neighborhood, barber.city].filter(Boolean).join('، ')}</Text>
                </View>
              ) : null}
              <View style={styles.ratingPill}>
                {barber.rating_count ? <Icon name="star" size={13} color={colors.accent} /> : null}
                <Text style={styles.rating}>
                  {barber.rating_count ? `${barber.average_rating.toFixed(1)} (${barber.rating_count})` : t('find.noRatings')}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text accessibilityRole="header" style={styles.identityName}>{t('find.barberProfileTitle')}</Text>
        )}
      </Stage>
      <View style={[styles.body, styles.lifted]}>
        {loading && !barber ? <BarberProfileSkeleton /> : null}
        {error && barber ? <ErrorBanner error={error} /> : null}
        {blocked ? (
          <Card style={styles.moderationCard}>
            <Text style={styles.bio}>{t('moderation.blockedProfile')}</Text>
            <UgcModerationActions
              targetKind="profile"
              targetId={id}
              targetName={t('find.barberProfileTitle')}
              blockTargetId={id}
              blocked
              onBlockChange={(next) => {
                setBlocked(next);
                if (!next) void load();
              }}
            />
          </Card>
        ) : barber ? (
          <>
            <Card elevated style={styles.identityCard}>
              {barber.bio ? <Text style={styles.bio}>{barber.bio}</Text> : null}
              {barber.phone ? (
                <Text style={styles.phone}>{t('find.phoneLabel')}: {`\u200E${barber.phone}`}</Text>
              ) : null}
              <View style={styles.actionRow}>
                {barber.phone ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('find.callBarber')}
                    onPress={() => void Linking.openURL(`tel:${barber.phone}`).catch(() => undefined)}
                    style={({ pressed }) => [styles.outlineAction, pressed && styles.outlineActionPressed]}
                  >
                    <Icon name="call-outline" size={18} color={colors.primary} />
                    <Text style={styles.outlineActionText}>{t('find.callBarber')}</Text>
                  </Pressable>
                ) : null}
                {barber.maps_url ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('find.openLocation')}
                    onPress={() => void Linking.openURL(barber.maps_url!).catch(() => undefined)}
                    style={({ pressed }) => [styles.outlineAction, pressed && styles.outlineActionPressed]}
                  >
                    <Icon name="navigate-outline" size={18} color={colors.primary} />
                    <Text style={styles.outlineActionText}>{t('find.openLocation')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>

            {queueStatus ? (
              <JoinQueueCard
                status={queueStatus}
                canJoin={profile?.role !== 'barber'}
                guest={isGuest}
                serviceChosen={Boolean(selectedServiceId)}
                joining={joinQueue.joining}
                error={joinQueue.error}
                onJoin={() => void onJoinQueue()}
              />
            ) : null}

            <SectionHeader title={t('booking.services')} />
            {barber.services.length ? (
              <View accessibilityRole="radiogroup" style={styles.services}>
                {barber.services.map((service) => (
                  <OptionCard
                    key={service.id}
                    title={service.name}
                    subtitle={`${service.duration_minutes} ${t('common.minutes')}`}
                    value={`${service.price_dzd} ${t('common.dzd')}`}
                    accessibilityLabel={service.name}
                    selected={selectedServiceId === service.id}
                    onPress={() => setSelectedServiceId(service.id)}
                  />
                ))}
              </View>
            ) : <EmptyState title={t('booking.noServicesAvailable')} />}

            {barber.shop ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${barber.shop.name}، ${t('find.viewShop')}`}
                onPress={() => router.push({ pathname: '/shop/[id]', params: { id: barber.shop!.id, returnTo: `/barber/${barber.id}` } })}
                style={({ pressed }) => [styles.shopCard, pressed && styles.shopCardPressed]}
              >
                <View style={styles.shopHeader}>
                  <View style={styles.shopCopy}>
                    <Text style={styles.shopName}>{barber.shop.name}</Text>
                    <Text style={styles.shopLocation}>{[barber.shop.neighborhood, barber.shop.city].filter(Boolean).join('، ')}</Text>
                  </View>
                  <Icon name="chevron-back" size={18} color={colors.primary} />
                </View>
                <View style={styles.shopFooter}>
                  <View style={styles.ratingPill}>
                    <Icon name="star" size={13} color={colors.accent} />
                    <Text style={styles.rating}>{barber.shop.average_rating.toFixed(1)} ({barber.shop.rating_count})</Text>
                  </View>
                  <Text style={styles.shopAction}>{t('find.viewShop')}</Text>
                </View>
              </Pressable>
            ) : null}

            {barber.weekly_hours.length ? (
              <>
                <SectionHeader title={t('booking.hours')} />
                <Card style={styles.hoursCard}>
                  {weeklyHoursRows(barber.weekly_hours).map((row) => (
                    <View key={row.day} style={styles.hoursRow}>
                      <Text style={styles.hoursDay}>{t(`find.day${row.day}` as 'find.day0')}</Text>
                      <Text style={[styles.hoursTime, !row.open && styles.hoursClosed]}>
                        {row.open ? `\u200E${row.open}` : t('find.closed')}
                      </Text>
                    </View>
                  ))}
                </Card>
              </>
            ) : null}

            {profile?.id && profile.id !== barber.id ? (
              <Card style={styles.moderationCard}>
                <UgcModerationActions
                  targetKind="profile"
                  targetId={barber.id}
                  targetName={barber.name}
                  blockTargetId={barber.id}
                  additionalReportTarget={{ kind: 'ratings', label: t('moderation.reportRatings') }}
                  onBlockChange={(next) => {
                    setBlocked(next);
                    if (next) setBarber(null);
                  }}
                />
              </Card>
            ) : null}

          </>
        ) : !loading ? (
          <View style={styles.errorCard}>
            <ErrorBanner error={error || new Error(t('find.empty'))} />
            {error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void load()} /> : null}
            <Button label={t('common.back')} variant="ghost" onPress={() => router.dismissTo(fallback)} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function BarberProfileSkeleton() {
  return (
    <View testID="barber-profile-skeleton" style={styles.skeleton}>
      <View style={styles.skeletonIdentity} />
      <View style={styles.skeletonHeading} />
      <View style={styles.skeletonService} />
      <View style={styles.skeletonService} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[6] },
  lifted: { marginTop: layout.stageBodyOverlap },
  backRow: { alignItems: 'flex-start' },
  actionRow: { flexDirection: 'row-reverse', gap: space[2] },
  hoursCard: { gap: space[2] },
  hoursRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  hoursDay: { ...typography.body, textAlign: 'right' },
  hoursTime: { ...typography.numeric, fontSize: 14 },
  hoursClosed: { ...typography.caption, color: colors.textSubtle },
  identityCard: { gap: space[3] },
  identityRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[4] },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: space[1] },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1] },
  moderationCard: { gap: space[2] },
  identityName: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  identityLocation: { ...typography.caption, color: colors.onPrimaryMuted, textAlign: 'right' },
  ratingPill: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[1], alignSelf: 'flex-end', paddingHorizontal: space[2], minHeight: 24, borderRadius: radii.pill, backgroundColor: colors.accentSoft },
  rating: { ...typography.label, fontSize: 12, lineHeight: 18, color: colors.accentText, textAlign: 'right' },
  bio: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  phone: { ...typography.caption, color: colors.text, textAlign: 'right' },
  outlineAction: { flex: 1, minHeight: 44, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: space[2], borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  outlineActionPressed: { backgroundColor: colors.primarySoft },
  outlineActionText: { ...typography.label, color: colors.primarySoftText },
  services: { gap: space[2] },
  shopCard: { gap: space[3], padding: space[4], borderRadius: radii.lg, backgroundColor: colors.surface, ...elevation.card },
  shopCardPressed: { backgroundColor: colors.primarySoft },
  shopHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  shopCopy: { flex: 1, alignItems: 'flex-end', gap: space[1] },
  shopName: { ...typography.bodyStrong, textAlign: 'right' },
  shopLocation: { ...typography.caption, textAlign: 'right' },
  shopFooter: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: space[3] },
  shopAction: { ...typography.label, color: colors.primarySoftText },
  errorCard: { gap: space[3], padding: layout.cardPadding, borderRadius: radii.lg, backgroundColor: colors.surface, ...elevation.card },
  footerRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[4] },
  footerSummary: { flexShrink: 1, alignItems: 'flex-end' },
  footerCaption: { ...typography.caption, textAlign: 'right' },
  footerHint: { flexShrink: 1 },
  footerPrice: { ...typography.numeric, fontSize: 17, lineHeight: 24, textAlign: 'right' },
  footerButton: { flex: 1 },
  skeleton: { gap: space[3] },
  skeletonIdentity: { height: 160, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  skeletonHeading: { width: '35%', height: 24, alignSelf: 'flex-end', borderRadius: radii.sm, backgroundColor: colors.surfaceMuted },
  skeletonService: { height: 64, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
});
