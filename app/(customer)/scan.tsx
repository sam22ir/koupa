import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { PrimaryButton } from '@/src/components/atoms/PrimaryButton';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useBooking } from '@/src/hooks/useBooking';
import { parseBarberCheckInPayload } from '@/src/qr';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function CustomerScanScreen() {
  const { loading, error, checkInWithQr, clearError } = useBooking();
  const [permission, requestPermission] = useCameraPermissions();
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState('');
  const handling = useRef(false);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(customer)/home');
  };

  const onBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (handling.current || success || loading) return;
      const barberId = parseBarberCheckInPayload(data);
      if (!barberId) {
        setLocalError(copy.customer.scanInvalid);
        return;
      }
      handling.current = true;
      setLocalError('');
      clearError();
      const result = await checkInWithQr(barberId);
      if (result) setSuccess(true);
      handling.current = false;
    },
    [checkInWithQr, clearError, loading, success],
  );

  return (
    <Screen scroll={false}>
      <ScreenHeader onBack={goBack} />
      <View style={styles.content}>
        <Text style={styles.title}>{copy.customer.scanTitle}</Text>
        <Text style={styles.body}>{copy.customer.scanBody}</Text>

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.success}>{copy.customer.scanSuccess}</Text>
            <PrimaryButton label={copy.customer.viewAppointment} onPress={() => router.replace('/(customer)/appointments')} />
          </View>
        ) : !permission?.granted ? (
          <View style={styles.permissionBox}>
            <Text style={styles.body}>{copy.customer.scanPermission}</Text>
            <PrimaryButton label={copy.customer.grantCamera} onPress={() => void requestPermission()} />
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={(event) => {
                void onBarcode(event);
              }}
            />
          </View>
        )}

        {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}
        {loading ? <Text style={styles.muted}>{copy.customer.loading}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.md },
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  body: {
    color: colors.muted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: typography.line.body,
    textAlign: 'right',
  },
  cameraWrap: {
    flex: 1,
    minHeight: 320,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  camera: { flex: 1 },
  permissionBox: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  successBox: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  success: {
    color: colors.primary,
    fontFamily: typography.fontFamily.bold,
    fontSize: typography.size.title,
    textAlign: 'center',
  },
  error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'right' },
  muted: { color: colors.muted, fontFamily: typography.fontFamily.regular, textAlign: 'center' },
});
