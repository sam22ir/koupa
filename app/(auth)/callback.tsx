import { useEffect, useRef, useState } from 'react';
import * as Linking from 'expo-linking';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { BrandLogo } from '@/src/components/atoms/BrandLogo';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { parseAuthCallback } from '@/src/auth';
import { useSession } from '@/src/hooks/useSession';
import { colors, spacing, typography } from '@/src/theme';

export default function AuthCallback() {
  const { completeAuthCallback } = useSession(); const [error, setError] = useState(''); const callbackUrl = Linking.useURL(); const completed = useRef(false);
  useEffect(() => { void (async () => { const url = callbackUrl ?? await Linking.getInitialURL(); if (!url || completed.current) return; completed.current = true; const params = parseAuthCallback(url); try { await completeAuthCallback(url); router.replace(params.type === 'recovery' ? '/reset-password' : '/'); } catch { if (params.error_code === 'otp_expired') router.replace({ pathname: '/email-confirmation', params: { expired: '1' } }); else setError(copy.auth.failed); } })(); }, [callbackUrl, completeAuthCallback]);
  return <Screen scroll={false}><View style={styles.center}><BrandLogo size={112} />{error ? <Text style={styles.error}>{error}</Text> : <><ActivityIndicator color={colors.primary} /><Text style={styles.text}>{copy.common.loading}</Text></>}</View></Screen>;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }, text: { color: colors.muted, fontFamily: typography.fontFamily.regular }, error: { color: colors.danger, fontFamily: typography.fontFamily.regular, textAlign: 'center' } });
