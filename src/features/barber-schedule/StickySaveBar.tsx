import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { space } from '@/src/theme';

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
  if (!dirty) return null;

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, space[3]) }]} pointerEvents="box-none">
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
    position: 'absolute',
    left: space[5],
    right: space[5],
  },
  button: {
    width: '100%',
    boxShadow: '0 4px 12px rgba(15, 28, 34, 0.18)',
  },
});
