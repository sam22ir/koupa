import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';

import { formatBookingTime } from '@/src/booking';
import { Button, Card, CustomerStageHeader, Icon, Screen } from '@/src/components/ui';
import { useBooking } from '@/src/hooks/useBooking';
import { t } from '@/src/i18n';
import { bookingErrorMessage } from '@/src/services/errors';
import {
  parseBarberCheckInPayload,
  type CheckInResult,
} from '@/src/qr';
import { colors, radii, space, typography } from '@/src/theme';

type ScanState =
  | { readonly kind: 'scanning' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'camera' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'result'; readonly result: CheckInResult }
  | { readonly kind: 'network' };

function interpolate(template: string, values: Readonly<Record<string, string>>): string {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, value),
    template,
  );
}

function resultMessage(result: CheckInResult): string {
  switch (result.code) {
    case 'CHECKED_IN':
      return t('scan.checkedIn');
    case 'ALREADY_PRESENT':
      return t('scan.alreadyPresent');
    case 'WRONG_BARBER':
      return interpolate(t('scan.wrongBarber'), {
        name: result.expectedBarberName ?? t('scan.unknownBarber'),
      });
    case 'TOO_EARLY':
      return interpolate(t('scan.tooEarly'), {
        time: result.checkInOpensAt ? formatBookingTime(result.checkInOpensAt) : '—',
      });
    case 'TOO_LATE':
      return interpolate(t('scan.tooLate'), {
        time: result.endsAt ? formatBookingTime(result.endsAt) : '—',
      });
    case 'CANCELLED':
      return t('scan.cancelled');
    case 'NO_ACTIVE_APPOINTMENT':
      return t('scan.noAppointment');
  }
}

function isSuccess(result: CheckInResult): boolean {
  return result.code === 'CHECKED_IN' || result.code === 'ALREADY_PRESENT';
}

export default function ScanScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string;
    barberName?: string;
    startsAt?: string;
  }>();
  const booking = useBooking();
  const [permission, requestPermission] = useCameraPermissions();
  const [state, setState] = useState<ScanState>({ kind: 'scanning' });

  const retry = () => {
    booking.clearError();
    setState({ kind: 'scanning' });
  };

  const closeScanner = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(customer)/home');
  };

  if (!permission) {
    return <Screen loading />;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain !== false;
    return (
      <Screen padded={false}>
        <CustomerStageHeader tone="stage" context={t('auth.roleCustomer')} title={t('scan.title')} subtitle={t('scan.permission')} />
        <View style={styles.permissionScreen}>
          <View style={styles.permissionIcon}>
            <Icon name="camera-outline" size={30} color={colors.primary} />
          </View>
          <Button
            label={canAskAgain ? t('scan.grant') : t('scan.openSettings')}
            onPress={() => {
              if (canAskAgain) {
                void requestPermission();
              } else {
                void Linking.openSettings();
              }
            }}
          />
          <Button label={t('common.close')} variant="ghost" onPress={closeScanner} />
        </View>
      </Screen>
    );
  }

  if (state.kind === 'camera' || state.kind === 'invalid' || state.kind === 'error' || state.kind === 'network' || state.kind === 'result') {
    const result = state.kind === 'result' ? state.result : null;
    const success = result ? isSuccess(result) : false;
    const message = state.kind === 'camera'
      ? t('scan.cameraUnavailable')
      : state.kind === 'invalid'
        ? t('scan.invalidQr')
        : state.kind === 'error'
          ? state.message
      : state.kind === 'network'
        ? t('scan.network')
        : resultMessage(result as CheckInResult);
    const appointmentId = result?.appointmentId ?? params.appointmentId;

    return (
      <Screen padded={false}>
        <CustomerStageHeader tone="stage" context={t('auth.roleCustomer')} title={t('scan.title')} />
        <View style={styles.resultScreen}>
        <Card elevated style={styles.resultCard}>
          <View style={[styles.resultIcon, success && styles.successIcon]}>
            <Icon
              name={success ? 'checkmark-circle' : 'alert-circle'}
              size={44}
              color={success ? colors.success : colors.danger}
            />
          </View>
          <Text style={styles.resultTitle}>{message}</Text>
          {success && result?.barberName ? (
            <Text style={styles.resultMeta}>{result.barberName}</Text>
          ) : null}
          {success && result?.serviceName ? (
            <Text style={styles.resultMeta}>{result.serviceName}</Text>
          ) : null}
          {success && appointmentId ? (
            <Button
              label={t('scan.viewAppointment')}
              onPress={() => router.dismissTo(`/appointment/${appointmentId}`)}
              style={styles.resultButton}
            />
          ) : (
            <Button
              label={t('scan.scanAgain')}
              onPress={retry}
              style={styles.resultButton}
            />
          )}
          <Button label={t('common.close')} variant="ghost" onPress={closeScanner} />
        </Card>
        </View>
      </Screen>
    );
  }

  const context = [
    params.barberName,
    params.startsAt ? formatBookingTime(params.startsAt) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Screen padded={false}>
      <CustomerStageHeader tone="stage" context={t('auth.roleCustomer')} title={t('scan.title')} subtitle={context || undefined} />
      <View style={styles.cameraFrame}>
        <CameraView
          testID="qr-camera"
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onMountError={() => setState({ kind: 'camera' })}
          onBarcodeScanned={
            state.kind === 'scanning'
              ? ({ data }) => {
                  const barberId = parseBarberCheckInPayload(data);
                  if (!barberId) {
                    setState({ kind: 'invalid' });
                    return;
                  }

                  setState({ kind: 'checking' });
                  void booking.checkInWithQr(barberId)
                    .then((result) => {
                      setState(result ? { kind: 'result', result } : { kind: 'network' });
                    })
                    .catch((caught) => {
                      setState({ kind: 'error', message: bookingErrorMessage(caught) });
                    });
                }
              : undefined
          }
        />
        <View pointerEvents="none" style={styles.focusFrame} />
        {state.kind === 'checking' ? (
          <View style={styles.checkingOverlay}>
            <ActivityIndicator color={colors.onPrimary} size="large" />
            <Text style={styles.checkingText}>{t('scan.checking')}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Text style={styles.hint}>{t('scan.hint')}</Text>
        <Button label={t('common.close')} variant="secondary" onPress={closeScanner} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  permissionScreen: {
    justifyContent: 'center',
    gap: space[5],
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    backgroundColor: colors.primarySoft,
  },
  header: {
    paddingHorizontal: space[5],
    paddingVertical: space[4],
  },
  cameraFrame: {
    flex: 1,
    marginHorizontal: space[5],
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  camera: {
    flex: 1,
  },
  focusFrame: {
    position: 'absolute',
    width: 230,
    height: 230,
    alignSelf: 'center',
    top: '25%',
    borderRadius: radii.lg,
    borderWidth: 3,
    borderColor: colors.onPrimary,
  },
  checkingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: colors.scrimStrong,
  },
  checkingText: {
    ...typography.bodyStrong,
    color: colors.onPrimary,
    textAlign: 'center',
  },
  footer: {
    padding: space[5],
    gap: space[3],
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resultScreen: {
    justifyContent: 'center',
  },
  resultCard: {
    alignItems: 'center',
    gap: space[3],
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
  },
  successIcon: {
    backgroundColor: colors.successSoft,
  },
  resultTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  resultMeta: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  resultButton: {
    width: '100%',
    marginTop: space[2],
  },
});
