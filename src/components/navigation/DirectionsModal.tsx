import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/src/components/ui/Button';
import { Chip } from '@/src/components/ui/Chip';
import { Icon } from '@/src/components/ui/Icon';
import { t } from '@/src/i18n';
import { colors, layout, radii, space, typography } from '@/src/theme';
import {
  launchNavigationProvider,
  resolveAppointmentCoordinates,
  type NavigationProvider,
} from '@/src/services/navigationLauncher';
import type { GeoPoint } from '@/src/location';

export interface DirectionsModalProps {
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly mapsUrl?: string | null;
  readonly coordinates?: GeoPoint | null;
  readonly destinationName?: string | null;
}

type ProviderOption = {
  readonly key: NavigationProvider;
  readonly title: string;
  readonly description: string;
  readonly icon: React.ComponentProps<typeof Icon>['name'];
  readonly badge?: string;
  readonly tone?: 'primary' | 'accent';
};

export function DirectionsModal({
  visible,
  onClose,
  mapsUrl,
  coordinates,
  destinationName,
}: DirectionsModalProps) {
  const resolvedCoords = coordinates ?? resolveAppointmentCoordinates(mapsUrl);
  const hasExactCoords = Boolean(resolvedCoords);
  const hasMapsUrl = Boolean(mapsUrl && mapsUrl.trim());

  const handleLaunch = async (provider: NavigationProvider) => {
    onClose();
    await launchNavigationProvider(provider, {
      coordinates: resolvedCoords,
      mapsUrl,
      destinationName,
    });
  };

  const options: readonly ProviderOption[] = [
    {
      key: 'google_maps',
      title: t('directions.googleMapsTitle'),
      description: hasExactCoords ? t('directions.googleMapsDesc') : t('directions.openMapsDirectly'),
      icon: 'navigate-circle-outline',
      tone: 'primary',
    },
    {
      key: 'yassir',
      title: t('directions.yassirTitle'),
      description: hasExactCoords ? t('directions.yassirDesc') : t('directions.requiresCoordinates'),
      icon: 'car-outline',
      badge: hasExactCoords ? t('directions.yassirBadge') : undefined,
      tone: 'accent',
    },
    {
      key: 'heetch',
      title: t('directions.heetchTitle'),
      description: hasExactCoords ? t('directions.heetchDesc') : t('directions.requiresCoordinates'),
      icon: 'car-sport-outline',
      badge: hasExactCoords ? t('directions.heetchBadge') : undefined,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel={t('common.close')}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <View style={styles.headerIconWrapper}>
              <Icon name="navigate-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>{t('directions.sheetTitle')}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {destinationName ? `${t('directions.destination')}: ${destinationName}` : t('directions.sheetSubtitle')}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.optionsList}>
            {options.map((option) => {
              const isAvailable = option.key === 'google_maps' ? (hasExactCoords || hasMapsUrl) : hasExactCoords;
              return (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title}، ${option.description}`}
                  accessibilityState={{ disabled: !isAvailable }}
                  disabled={!isAvailable}
                  onPress={() => void handleLaunch(option.key)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    !isAvailable && styles.optionRowDisabled,
                    pressed && isAvailable && styles.optionRowPressed,
                  ]}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionTitleRow}>
                      {option.badge ? <Chip label={option.badge} tone={option.tone ?? 'neutral'} /> : null}
                      <Text style={[styles.optionTitle, !isAvailable && styles.optionTitleDisabled]}>
                        {option.title}
                      </Text>
                    </View>
                    <Text style={[styles.optionDesc, !isAvailable && styles.optionDescDisabled]}>
                      {option.description}
                    </Text>
                  </View>
                  <View style={[styles.optionIconBox, option.tone === 'accent' ? styles.optionIconAccent : styles.optionIconPrimary]}>
                    <Icon
                      name={option.icon}
                      size={24}
                      color={!isAvailable ? colors.textMuted : option.tone === 'accent' ? colors.accent : colors.primary}
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Button
              label={t('common.cancel')}
              variant="secondary"
              onPress={onClose}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space[3],
    paddingBottom: space[6],
    gap: space[3],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: space[1],
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  headerIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'right',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  optionsList: {
    gap: space[2],
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: space[3],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: space[3],
  },
  optionRowDisabled: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.65,
  },
  optionRowPressed: {
    backgroundColor: colors.primarySoft,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconPrimary: {
    backgroundColor: colors.primarySoft,
  },
  optionIconAccent: {
    backgroundColor: colors.accentSoft,
  },
  optionContent: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  optionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  optionTitle: {
    ...typography.bodyStrong,
    color: colors.text,
    textAlign: 'right',
  },
  optionTitleDisabled: {
    color: colors.textMuted,
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  optionDescDisabled: {
    color: colors.textMuted,
  },
  footer: {
    marginTop: space[2],
  },
});
