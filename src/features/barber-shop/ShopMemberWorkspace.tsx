import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Alert } from '@/src/utils/alert';
import { useState } from 'react';

import { BackButton } from '@/src/components/ui/BackButton';
import { CustomerStageHeader } from '@/src/components/ui/CustomerStageHeader';
import { ErrorBanner } from '@/src/components/ui/ErrorBanner';
import { BookingRulesEditor } from '@/src/features/barber-schedule/BookingRulesEditor';
import { ExceptionEditor } from '@/src/features/barber-schedule/ExceptionEditor';
import { ScheduleWorkspaceTabs, type WorkspaceTab } from '@/src/features/barber-schedule/ScheduleWorkspaceTabs';
import { ServicesEditor } from '@/src/features/barber-schedule/ServicesEditor';
import { StickySaveBar } from '@/src/features/barber-schedule/StickySaveBar';
import { WeeklyScheduleEditor } from '@/src/features/barber-schedule/WeeklyScheduleEditor';
import { ShopActivityList, type ShopActivityItem } from '@/src/features/barber-shop/ShopActivityList';
import { ShopMemberSummary } from '@/src/features/barber-shop/ShopMemberSummary';
import { t } from '@/src/i18n';
import type { ShopMembership } from '@/src/shops';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

type WorkspaceSettings = {
  readonly loaded: unknown;
  readonly draft: import('@/src/features/barber-schedule/model').BarberScheduleWorkspaceDraft;
  readonly setDraft: (value: import('@/src/features/barber-schedule/model').BarberScheduleWorkspaceDraft) => void;
  readonly dirty: boolean;
  readonly errors: import('@/src/features/barber-schedule/model').WorkspaceValidationErrors;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string;
  readonly message: string;
  readonly save: () => Promise<boolean>;
  readonly reset: () => void;
};

type Props = {
  readonly member: ShopMembership;
  readonly activity: readonly ShopActivityItem[];
  readonly settings: WorkspaceSettings;
  readonly onRemove: () => void;
  readonly onBack?: () => void;
};

type ViewTab = 'summary' | 'scheduleServices' | 'activity';

export function ShopMemberWorkspace({ member, activity, settings, onRemove, onBack }: Props) {
  const [view, setView] = useState<ViewTab>('summary');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('schedule');

  const updateSettings = (patch: Partial<typeof settings.draft.settings>) => {
    settings.setDraft({
      ...settings.draft,
      settings: { ...settings.draft.settings, ...patch },
    });
  };

  const confirmRemove = () => {
    Alert.alert(
      t('shopWorkspace.removeConfirmTitle'),
      t('shopWorkspace.removeConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('shopWorkspace.removeMember'), style: 'destructive', onPress: onRemove },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <CustomerStageHeader
        title={member.barber_name ?? t('shopWorkspace.members')}
        context={t('auth.roleBarber')}
        trailing={onBack ? <BackButton fallback="/(barber)/shop" onPress={onBack} /> : undefined}
      />

      <View style={styles.tabs} accessibilityRole="tablist">
        {[
          { key: 'summary' as const, label: t('shopWorkspace.summary') },
          { key: 'scheduleServices' as const, label: t('shopWorkspace.scheduleServices') },
          { key: 'activity' as const, label: t('shopWorkspace.activity') },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: view === tab.key }}
            onPress={() => setView(tab.key)}
            style={[styles.tab, view === tab.key && styles.selectedTab]}
          >
            <Text style={[styles.tabText, view === tab.key && styles.selectedTabText]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ErrorBanner error={settings.error || null} />

      {view === 'summary' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ShopMemberSummary member={member} onRemove={confirmRemove} saving={settings.saving} />
        </ScrollView>
      ) : null}

      {view === 'activity' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ShopActivityList items={activity} />
        </ScrollView>
      ) : null}

      {view === 'scheduleServices' ? (
        <>
          <ScrollView contentContainerStyle={styles.editorContent}>
            <ScheduleWorkspaceTabs
              value={workspaceTab}
              onChange={setWorkspaceTab}
              errors={{
                schedule: Boolean(settings.errors.schedule || settings.errors.exceptions),
                services: Boolean(settings.errors.services),
                rules: Boolean(settings.errors.rules),
              }}
            />
            <View style={styles.editorSurface}>
              {workspaceTab === 'schedule' ? (
                <>
                  <WeeklyScheduleEditor
                    schedules={settings.draft.settings.schedules}
                    error={settings.errors.schedule}
                    onChange={(schedules) => updateSettings({ schedules })}
                  />
                  <View style={styles.divider} />
                  <ExceptionEditor
                    exceptions={settings.draft.exceptions}
                    error={settings.errors.exceptions}
                    onChange={(exceptions) => settings.setDraft({ ...settings.draft, exceptions })}
                  />
                </>
              ) : null}
              {workspaceTab === 'services' ? (
                <ServicesEditor
                  services={settings.draft.settings.services}
                  error={settings.errors.services}
                  onChange={(services) => updateSettings({ services })}
                />
              ) : null}
              {workspaceTab === 'rules' ? (
                <BookingRulesEditor
                  settings={settings.draft.settings}
                  error={settings.errors.rules}
                  onChange={updateSettings}
                />
              ) : null}
            </View>
          </ScrollView>
          <StickySaveBar
            dirty={settings.dirty}
            saving={settings.saving}
            disabled={settings.loading}
            onSave={() => void settings.save()}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, gap: space[3] },
  tabs: { flexDirection: 'row-reverse', marginHorizontal: layout.screenPaddingX, padding: space[1], borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  selectedTab: { backgroundColor: colors.surface, ...elevation.card },
  tabText: { ...typography.label, color: colors.textMuted, textAlign: 'center' },
  selectedTabText: { color: colors.primarySoftText },
  scrollContent: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4], paddingBottom: space[10] },
  editorContent: { gap: space[4], paddingHorizontal: layout.screenPaddingX, paddingVertical: space[4], paddingBottom: space[8] },
  editorSurface: { gap: space[6], borderRadius: radii.lg, backgroundColor: colors.surface, padding: space[4], ...elevation.card },
  divider: { height: 1, backgroundColor: colors.borderSubtle },
});
