import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorBanner, Icon, Screen } from '@/src/components/ui';
import { BookingRulesEditor } from '@/src/features/barber-schedule/BookingRulesEditor';
import { ExceptionEditor } from '@/src/features/barber-schedule/ExceptionEditor';
import { ScheduleWorkspaceTabs, type WorkspaceTab } from '@/src/features/barber-schedule/ScheduleWorkspaceTabs';
import { ServicesEditor } from '@/src/features/barber-schedule/ServicesEditor';
import { StickySaveBar } from '@/src/features/barber-schedule/StickySaveBar';
import { validateWorkspace } from '@/src/features/barber-schedule/model';
import { WeeklyScheduleEditor } from '@/src/features/barber-schedule/WeeklyScheduleEditor';
import { WorkspaceSwitch } from '@/src/features/barber-schedule/WorkspaceSwitch';
import { useBarberSettings } from '@/src/hooks/useBarberSettings';
import { useUnsavedWorkspaceLeaveGuard } from '@/src/hooks/useUnsavedWorkspaceLeaveGuard';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, radii, space, typography } from '@/src/theme';

function firstInvalidTab(errors: ReturnType<typeof validateWorkspace>): WorkspaceTab | null {
  if (errors.schedule || errors.exceptions) return 'schedule';
  if (errors.services) return 'services';
  if (errors.rules) return 'rules';
  return null;
}

function errorMessage(code: string) {
  if (code === 'invalidTime') return t('scheduleWorkspace.invalidTime');
  if (code === 'validation') return t('scheduleWorkspace.validation');
  if (code) return t('scheduleWorkspace.saveFailed');
  return '';
}

export default function BarberScheduleScreen() {
  const { profile, session } = useAppSession();
  const settings = useBarberSettings({ userId: session?.user.id ?? profile?.id });
  const { dirty, draft, reset, save: persistSave } = settings;
  const [tab, setTab] = useState<WorkspaceTab>('schedule');

  const save = useCallback(async () => {
    const validation = validateWorkspace(draft);
    const invalidTab = firstInvalidTab(validation);
    if (invalidTab) setTab(invalidTab);
    return persistSave();
  }, [draft, persistSave]);

  useUnsavedWorkspaceLeaveGuard({ dirty, reset, save });

  const workspaceErrors = {
    schedule: Boolean(settings.errors.schedule || settings.errors.exceptions),
    services: Boolean(settings.errors.services),
    rules: Boolean(settings.errors.rules),
  };

  const updateSettings = (patch: Partial<typeof settings.draft.settings>) =>
    settings.setDraft({
      ...settings.draft,
      settings: { ...settings.draft.settings, ...patch },
    });

  const setAcceptingBookings = (accepting: boolean) => {
    if (accepting) {
      updateSettings({ isBookingPaused: false });
      return;
    }
    Alert.alert(
      t('scheduleWorkspace.pauseTitle'),
      t('scheduleWorkspace.pauseBody'),
      [
        { text: t('scheduleWorkspace.pauseCancel'), style: 'cancel' },
        { text: t('scheduleWorkspace.pauseConfirm'), style: 'destructive', onPress: () => updateSettings({ isBookingPaused: true }) },
      ],
    );
  };

  return (
    <Screen padded={false} loading={settings.loading} style={styles.screen}>
      <View style={styles.workspace}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {settings.dirty ? (
            <View style={styles.dirtyBadge}>
              <View style={styles.dirtyDot} />
              <Text style={styles.dirtyBadgeText}>{t('scheduleWorkspace.dirty')}</Text>
            </View>
          ) : null}
          <ErrorBanner error={errorMessage(settings.error) || null} />
          {settings.message === 'saved' ? (
            <View style={styles.success} accessibilityLiveRegion="polite">
              <Icon name="checkmark-circle" size={19} color={colors.primary} />
              <Text style={styles.successText}>{t('scheduleWorkspace.saved')}</Text>
            </View>
          ) : null}

          <View style={styles.bookingControl}>
            <WorkspaceSwitch
              label={t('scheduleWorkspace.acceptingBookings')}
              value={!settings.draft.settings.isBookingPaused}
              onValueChange={setAcceptingBookings}
            />
            <View style={styles.bookingCopy}>
              <Text style={styles.bookingLabel}>{t('scheduleWorkspace.acceptingBookings')}</Text>
              <Text style={[styles.bookingStatus, settings.draft.settings.isBookingPaused && styles.pausedText]}>
                {settings.draft.settings.isBookingPaused
                  ? t('scheduleWorkspace.pausedStatus')
                  : t('scheduleWorkspace.acceptingStatus')}
              </Text>
            </View>
          </View>

          <ScheduleWorkspaceTabs value={tab} onChange={setTab} errors={workspaceErrors} />

          <View style={styles.editorSurface}>
            {tab === 'schedule' ? (
              <>
                <WeeklyScheduleEditor
                  schedules={settings.draft.settings.schedules}
                  error={settings.errors.schedule}
                  onChange={(schedules) => updateSettings({ schedules })}
                />
                <View style={styles.sectionDivider} />
                <ExceptionEditor
                  exceptions={settings.draft.exceptions}
                  error={settings.errors.exceptions}
                  onChange={(exceptions) => settings.setDraft({ ...settings.draft, exceptions })}
                />
              </>
            ) : null}
            {tab === 'services' ? (
              <ServicesEditor
                services={settings.draft.settings.services}
                error={settings.errors.services}
                onChange={(services) => updateSettings({ services })}
              />
            ) : null}
            {tab === 'rules' ? (
              <BookingRulesEditor
                settings={settings.draft.settings}
                error={settings.errors.rules}
                onChange={updateSettings}
              />
            ) : null}
          </View>
        </ScrollView>
      </View>

      <StickySaveBar
        dirty={settings.dirty}
        saving={settings.saving}
        disabled={settings.loading}
        onSave={() => void save()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  dirtyBadge: { maxWidth: 160, flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  dirtyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  dirtyBadgeText: { ...typography.caption, color: colors.accentText, textAlign: 'right' },
  screen: { backgroundColor: colors.workspace },
  workspace: {
    flex: 1,
    backgroundColor: colors.workspace,
  },
  scroll: { flex: 1, backgroundColor: colors.workspace },
  scrollContent: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingBottom: space[16] + space[4] },
  success: { minHeight: 42, flexDirection: 'row-reverse', alignItems: 'center', gap: space[2], borderRadius: radii.md, backgroundColor: colors.successSoft, paddingHorizontal: space[3] },
  successText: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  bookingControl: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  bookingCopy: { flex: 1, gap: space[1], alignItems: 'flex-end' },
  bookingLabel: { ...typography.bodyStrong, textAlign: 'right' },
  bookingStatus: { ...typography.caption, color: colors.primary, textAlign: 'right' },
  pausedText: { color: colors.danger },
  editorSurface: {
    gap: space[6],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: space[4],
  },
  sectionDivider: { height: 1, backgroundColor: colors.border },
});
