import { router, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Button as HeroButton } from 'heroui-native/button';

import { Icon } from './Icon';
import { t } from '@/src/i18n';
import { colors, radii } from '@/src/theme';

export function BackButton({ fallback, tone = 'primary', onPress }: { readonly fallback: Href; readonly tone?: 'primary' | 'onPrimary'; readonly onPress?: () => void }) {
  const goBack = () => {
    if (onPress) {
      onPress();
      return;
    }
    router.dismissTo(fallback);
  };

  return (
    <HeroButton
      variant="ghost"
      isIconOnly
      accessibilityLabel={t('common.back')}
      onPress={goBack}
      style={tone === 'onPrimary' ? styles.onPrimary : styles.primary}
    >
      <Icon name="arrow-forward" size={20} color={tone === 'onPrimary' ? colors.onPrimary : colors.primary} />
    </HeroButton>
  );
}

const styles = StyleSheet.create({
  primary: {
    width: 44,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  onPrimary: {
    width: 44,
    height: 44,
    minHeight: 44,
    paddingHorizontal: 0,
    borderWidth: 1,
    borderColor: colors.stageBorder,
    borderRadius: radii.md,
    backgroundColor: colors.stageOverlay,
  },
});