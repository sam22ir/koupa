import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { colors, space } from '@/src/theme';

export function StickySaveBar({
  dirty,
  saving,
  disabled,
  onSave,
}: {
  readonly dirty: boolean;
  readonly saving: boolean;
  readonly disabled?: boolean;
  readonly onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, space[3]) }]}>
      <Button
        label={t('scheduleWorkspace.save')}
        onPress={onSave}
        loading={saving}
        disabled={disabled || !dirty}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space[5],
    paddingTop: space[3],
    gap: space[2],
  },
  button: {
    width: '100%',
  },
});
