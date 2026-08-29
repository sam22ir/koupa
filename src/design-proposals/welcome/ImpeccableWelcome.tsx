import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo, Icon } from '@/src/components/ui';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

type Props = {
  onStart?: () => void;
  onSignIn?: () => void;
  onBack?: () => void;
};

/**
 * Concept 1: "Impeccable" (الدقة المعمارية)
 * - Ultra-refined alignment and golden-ratio typographic scale.
 * - Monolithic quiet paper surface with precise micro-metrics.
 * - Dual architectural pillar cards for Customer and Barber.
 */
export function ImpeccableWelcome({ onStart, onSignIn, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'customer' | 'barber'>('customer');

  return (
    <View style={styles.root}>
      {/* Precision Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top + space[2], space[4]) }]}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع إلى المقترحات"
            onPress={onBack}
            style={styles.backChip}
          >
            <Icon name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.backChipText}>المقترحات</Text>
          </Pressable>
        ) : (
          <View style={styles.badgePlaceholder} />
        )}
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>كوپا</Text>
          <BrandLogo variant="mark" height={36} />
        </View>
        <View style={styles.precisionPill}>
          <Text style={styles.precisionPillText}>دقة · نظام</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Architectural Hero */}
        <View style={styles.heroBlock}>
          <View style={styles.goldHairline} />
          <Text style={styles.heroEyebrow}>المعيار الجديد للمواعيد</Text>
          <Text style={styles.heroTitle}>احجز وقتك بدقة، دون انتظار</Text>
          <Text style={styles.heroSubtitle}>
            تجربة رقمية صامتة تجمعك بأفضل صالونات الحلاقة مع وضوح كامل في المواعيد والأسعار.
          </Text>
        </View>

        {/* 3-Column Micro-Metrics Bar */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>0 دقيقة</Text>
            <Text style={styles.metricLabel}>وقت انتظار</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>100%</Text>
            <Text style={styles.metricLabel}>شفافية الأسعار</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>QR فوري</Text>
            <Text style={styles.metricLabel}>تأكيد الحضور</Text>
          </View>
        </View>

        {/* Dual Pillar Segmented Switch */}
        <View style={styles.segmentedContainer}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'customer' }}
            onPress={() => setActiveTab('customer')}
            style={[styles.segmentBtn, activeTab === 'customer' && styles.segmentBtnActive]}
          >
            <Text
              style={[styles.segmentBtnText, activeTab === 'customer' && styles.segmentBtnTextActive]}
            >
              للزوار والزبائن
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'barber' }}
            onPress={() => setActiveTab('barber')}
            style={[styles.segmentBtn, activeTab === 'barber' && styles.segmentBtnActive]}
          >
            <Text
              style={[styles.segmentBtnText, activeTab === 'barber' && styles.segmentBtnTextActive]}
            >
              لأصحاب الصالونات
            </Text>
          </Pressable>
        </View>

        {/* Architectural Pillar Card */}
        <View style={styles.pillarCard}>
          {activeTab === 'customer' ? (
            <>
              <View style={styles.pillarHeader}>
                <View style={styles.pillarIconBox}>
                  <Icon name="calendar-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.pillarTitleBlock}>
                  <Text style={styles.pillarTitle}>حجز فوري مؤكد</Text>
                  <Text style={styles.pillarSubtitle}>اختر الحلاق والخدمة والوقت بلمسة</Text>
                </View>
              </View>
              <View style={styles.pillarList}>
                <View style={styles.pillarRow}>
                  <Icon name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.pillarRowText}>ابحث عن الصالونات الأقرب لموقعك مع التقييمات الحقيقية</Text>
                </View>
                <View style={styles.pillarRow}>
                  <Icon name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.pillarRowText}>تثبيت موعدك فورياً دون الحاجة لأي اتصال هاتفي</Text>
                </View>
                <View style={styles.pillarRow}>
                  <Icon name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.pillarRowText}>مسح رمز QR لدى وصولك لتأكيد حضورك والبدء مباشرة</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.pillarHeader}>
                <View style={styles.pillarIconBox}>
                  <Icon name="briefcase-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.pillarTitleBlock}>
                  <Text style={styles.pillarTitle}>إدارة متكاملة لصالونك</Text>
                  <Text style={styles.pillarSubtitle}>نظم مواعيدك وضاعف إنتاجية يومك</Text>
                </View>
              </View>
              <View style={styles.pillarList}>
                <View style={styles.pillarRow}>
                  <Icon name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.pillarRowText}>جدول عمل مرن وتحديد دقيق للخدمات والأسعار والمدد</Text>
                </View>
                <View style={styles.pillarRow}>
                  <Icon name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.pillarRowText}>استقبال الحجوزات آلياً وتفادي التضارب في أوقات الكراسي</Text>
                </View>
                <View style={styles.pillarRow}>
                  <Icon name="checkmark-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.pillarRowText}>لوحة يومية لمتابعة الإيرادات والمواعيد المنجزة</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Action Controls */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onStart}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.primaryBtnText}>ابدأ الآن</Text>
            <Icon name="arrow-forward" size={18} color={colors.onPrimary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onSignIn}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.secondaryBtnText}>لدي حساب بالفعل · تسجيل الدخول</Text>
          </Pressable>
        </View>

        {/* Minimal Colophon */}
        <Text style={styles.colophon}>
          تطبيق كوپا الرسمي · الجزائر · جميع الحقوق محفوظة
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[3],
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  brandName: {
    fontFamily: typography.brand.fontFamily,
    fontSize: 24,
    color: colors.primary,
  },
  backChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radii.pill,
  },
  backChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  badgePlaceholder: {
    width: 60,
  },
  precisionPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  precisionPillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space[5],
    gap: space[4],
  },
  heroBlock: {
    gap: space[2],
    alignItems: 'flex-end',
  },
  goldHairline: {
    width: 42,
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    marginBottom: space[1],
  },
  heroEyebrow: {
    ...typography.label,
    color: colors.accentText,
    textAlign: 'right',
  },
  heroTitle: {
    fontFamily: typography.title.fontFamily,
    fontSize: 28,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'right',
  },
  heroSubtitle: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'right',
  },
  metricsGrid: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: space[3],
    paddingHorizontal: space[2],
    ...elevation.card,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  metricValue: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.primary,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: space[1],
  },
  segmentedContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: space[1],
    gap: space[1],
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  segmentBtnText: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.textMuted,
  },
  segmentBtnTextActive: {
    color: colors.primary,
  },
  pillarCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    gap: space[3],
    ...elevation.card,
  },
  pillarHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: space[3],
  },
  pillarIconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarTitleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pillarTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  pillarSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
  },
  pillarList: {
    gap: space[2],
  },
  pillarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  pillarRowText: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    marginTop: space[3],
    gap: space[2],
  },
  primaryBtn: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  primaryBtnText: {
    ...typography.button,
    color: colors.onPrimary,
    fontSize: 16,
  },
  secondaryBtn: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textMuted,
  },
  btnPressed: {
    opacity: 0.85,
  },
  colophon: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: space[2],
  },
});
