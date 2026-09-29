import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatBookingTime } from '@/src/booking';
import { Button, Card, Icon } from '@/src/components/ui';
import { useBarberQueue } from '@/src/hooks/useQueue';
import { t } from '@/src/i18n';
import {
  callGraceMinutesLeft,
  queueActionsFor,
  type QueueAction,
  type QueueEntry,
} from '@/src/queue';
import { colors, fonts, radii, space, typography } from '@/src/theme';
import { Alert } from '@/src/utils/alert';
import { WorkspaceSwitch } from '@/src/features/barber-schedule/WorkspaceSwitch';

const actionLabels: Record<QueueAction, string> = {
  call: t('queue.call'),
  start: t('queue.start'),
  finish: t('queue.finish'),
  no_show: t('queue.noShow'),
  remove: t('queue.remove'),
};

const statusLabels = {
  waiting: t('queue.statusWaiting'),
  called: t('queue.statusCalled'),
  serving: t('queue.statusServing'),
} as const;

type Props = {
  /** Whether the screen is focused; the queue only polls while it is. */
  readonly active: boolean;
  readonly published: boolean;
};

/** The barber's walk-in queue: open/close, add a walk-in, and move people along. */
export function BarberQueueCard({ active, published }: Props) {
  const { queue, loading, error, pendingId, setOpen, addWalkin, update } = useBarberQueue(active && published);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!published) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>{t('queue.title')}</Text>
        <Text style={styles.hint}>{t('queue.needsPublish')}</Text>
      </Card>
    );
  }

  const open = queue?.queue_open ?? false;
  const entries = queue?.entries ?? [];

  const onAction = (entry: QueueEntry, action: QueueAction) => {
    if (action === 'remove' || action === 'no_show') {
      Alert.alert(t('queue.removeConfirmTitle'), t('queue.removeConfirmBody'), [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), style: 'destructive', onPress: () => void update(entry.id, action) },
      ]);
      return;
    }
    void update(entry.id, action);
  };

  return (
    <Card style={styles.card} testID="barber-queue-card">
      <View style={styles.headerRow}>
        <WorkspaceSwitch
          label={t('queue.title')}
          value={open}
          onValueChange={(next) => void setOpen(next)}
        />
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>{t('queue.title')}</Text>
          <Text style={[styles.state, open && styles.stateOpen]}>{open ? t('queue.open') : t('queue.closed')}</Text>
        </View>
      </View>
      <Text style={styles.hint}>{open ? t('queue.openHint') : t('queue.closedHint')}</Text>

      {open && queue?.next_booking_at ? (
        <View style={styles.bookingNote}>
          <Icon name="calendar-outline" size={16} color={colors.primarySoftText} />
          <Text style={styles.bookingNoteText}>
            {`${t('queue.nextBooking')} ${formatBookingTime(queue.next_booking_at)}`}
          </Text>
        </View>
      ) : null}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

      {loading && !queue ? <ActivityIndicator color={colors.primary} /> : null}

      {open ? (
        <>
          {entries.length === 0 && !loading ? <Text style={styles.empty}>{t('queue.empty')}</Text> : null}
          {entries.map((entry, index) => (
            <View
              key={entry.id}
              testID="queue-entry"
              style={[styles.entry, entry.status === 'serving' && styles.entryServing]}
            >
              <View style={styles.entryTop}>
                <View style={styles.entryCopy}>
                  <Text numberOfLines={1} style={styles.entryName}>{entry.name}</Text>
                  <Text numberOfLines={1} style={styles.entryMeta}>
                    {[entry.service_name, entry.source === 'remote' ? t('queue.sourceRemote') : t('queue.sourceBarber')]
                      .filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View style={styles.entryStatus}>
                  <Text style={styles.entryOrder}>{(index + 1).toLocaleString('ar-DZ')}</Text>
                  <Text style={styles.entryStatusText}>
                    {statusLabels[entry.status]}
                    {entry.status === 'called'
                      ? ` · ${callGraceMinutesLeft(entry.called_at).toLocaleString('ar-DZ')} ${t('common.minutes')}`
                      : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {queueActionsFor(entry).map((action) => (
                  <Pressable
                    key={action}
                    accessibilityRole="button"
                    accessibilityLabel={`${actionLabels[action]}، ${entry.name}`}
                    disabled={pendingId !== null}
                    onPress={() => onAction(entry, action)}
                    style={({ pressed }) => [
                      styles.pill,
                      (action === 'start' || action === 'finish') && styles.pillPrimary,
                      pressed && styles.pillPressed,
                      pendingId === entry.id && styles.pillBusy,
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        (action === 'start' || action === 'finish') && styles.pillTextPrimary,
                        (action === 'remove' || action === 'no_show') && styles.pillTextDanger,
                      ]}
                    >
                      {actionLabels[action]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Button
            label={t('queue.addWalkin')}
            variant="secondary"
            onPress={() => setSheetOpen(true)}
            testID="queue-add-walkin"
          />
        </>
      ) : null}

      <WalkinSheet
        visible={sheetOpen}
        services={queue?.services ?? []}
        saving={pendingId === 'walkin'}
        onClose={() => setSheetOpen(false)}
        onSave={async (name, serviceId) => {
          const ok = await addWalkin(name, serviceId);
          if (ok) setSheetOpen(false);
        }}
      />
    </Card>
  );
}

function WalkinSheet({ visible, services, saving, onClose, onSave }: {
  readonly visible: boolean;
  readonly services: readonly { readonly id: string; readonly name: string }[];
  readonly saving: boolean;
  readonly onClose: () => void;
  readonly onSave: (name: string, serviceId: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const selected = serviceId ?? (services.length === 1 ? services[0].id : null);
  const ready = name.trim().length > 0 && Boolean(selected);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.sheetTitle}>{t('queue.walkinTitle')}</Text>
          <Text style={styles.label}>{t('queue.walkinName')}</Text>
          <TextInput
            accessibilityLabel={t('queue.walkinName')}
            value={name}
            onChangeText={setName}
            maxLength={60}
            style={styles.input}
            textAlign="right"
            returnKeyType="done"
          />
          <Text style={styles.label}>{t('queue.walkinService')}</Text>
          {services.length === 0 ? <Text style={styles.hint}>{t('queue.walkinNoServices')}</Text> : (
            <View style={styles.chips} accessibilityRole="radiogroup">
              {services.map((service) => {
                const on = selected === service.id;
                return (
                  <Pressable
                    key={service.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={service.name}
                    onPress={() => setServiceId(service.id)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{service.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Button
            label={t('queue.walkinSave')}
            disabled={!ready}
            loading={saving}
            onPress={() => {
              if (!selected) return;
              void onSave(name, selected).then(() => setName(''));
            }}
          />
          <Button label={t('common.cancel')} variant="ghost" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  headerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  headerCopy: { alignItems: 'flex-end', gap: 2, flex: 1 },
  title: { ...typography.titleSm, textAlign: 'right' },
  state: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  stateOpen: { color: colors.success },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  error: { ...typography.caption, color: colors.danger, textAlign: 'right' },
  bookingNote: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  bookingNoteText: { ...typography.label, color: colors.primarySoftText, textAlign: 'right', flex: 1 },
  entry: {
    gap: space[3],
    padding: space[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  entryServing: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  entryTop: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[3] },
  entryCopy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  entryName: { ...typography.bodyStrong, textAlign: 'right' },
  entryMeta: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  entryStatus: { alignItems: 'center', gap: 2 },
  entryOrder: { ...typography.numeric, color: colors.primarySoftText },
  entryStatusText: { ...typography.caption, color: colors.textMuted },
  actions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  pill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillPressed: { opacity: 0.8 },
  pillBusy: { opacity: 0.5 },
  pillText: { ...typography.chip, color: colors.text },
  pillTextPrimary: { color: colors.onPrimary },
  pillTextDanger: { color: colors.danger },
  backdrop: { flex: 1, justifyContent: 'center', backgroundColor: colors.scrim, padding: space[5] },
  sheet: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: space[3],
    padding: space[5],
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
  },
  sheetTitle: { ...typography.titleSm, textAlign: 'right' },
  label: { ...typography.label, color: colors.textMuted, textAlign: 'right' },
  input: {
    minHeight: 52,
    paddingHorizontal: space[4],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2] },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.chip, color: colors.text },
  chipTextOn: { color: colors.onPrimary },
});
