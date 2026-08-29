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

type DemoService = {
  id: string;
  name: string;
  price: string;
  duration: string;
};

const DEMO_SERVICES: DemoService[] = [
  { id: '1', name: 'قص شعر ولحية', price: '1,200 دج', duration: '40 د' },
  { id: '2', name: 'حلاقة كلاسيكية', price: '800 دج', duration: '25 د' },
  { id: '3', name: 'تصفيف وعناية VIP', price: '1,600 دج', duration: '55 د' },
];

const DEMO_SLOTS = ['15:30', '16:45', '18:00'];

/**
 * Concept 3: "UI/UX Pro Max" (الأداء التفاعلي الأقصى والفاعلية)
 * - Highly tangible interactive booking simulator right on the welcome screen.
 * - Dynamic persona switcher with real-time value calculation.
 * - Sticky bottom conversion action bar.
 */
export function ProMaxUtilityWelcome({ onStart, onSignIn, onBack }: Props) {
  const insets = useSafeAreaInsets();
  const [persona, setPersona] = useState<'customer' | 'barber'>('customer');
  const [selectedService, setSelectedService] = useState<DemoService>(DEMO_SERVICES[0]);
  const [selectedSlot, setSelectedSlot] = useState<string>(DEMO_SLOTS[0]);

  return (
    <View style={styles.root}>
      {/* Dynamic Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + space[2], space[4]) }]}>
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
          <Text style={styles.brandTitle}>كوپا</Text>
          <BrandLogo variant="mark" height={32} />
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>حجز مباشر</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[14] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Value Proposition Hero */}
        <View style={styles.heroSection}>
          <Text style={styles.heroKicker}>وفر وقتك · اضمن موعدك</Text>
          <Text style={styles.heroHeadline}>جرب سهولة الحجز مع كوپا الآن</Text>
          <Text style={styles.heroBody}>
            اضغط وجرّب بنفسك كيف تختار خدمتك وتثبت موعدك في أقل من دقيقة:
          </Text>
        </View>

        {/* Tactile Persona Switcher */}
        <View style={styles.personaSwitch}>
          <Pressable
            testID="persona-tab-customer"
            accessibilityRole="tab"
            accessibilityLabel="تجربة الزبون"
            accessibilityState={{ selected: persona === 'customer' }}
            onPress={() => setPersona('customer')}
            style={[styles.personaBtn, persona === 'customer' && styles.personaBtnActive]}
          >
            <Icon
              name="person-outline"
              size={16}
              color={persona === 'customer' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[styles.personaBtnText, persona === 'customer' && styles.personaBtnTextActive]}
            >
              تجربة الزبون
            </Text>
          </Pressable>
          <Pressable
            testID="persona-tab-barber"
            accessibilityRole="tab"
            accessibilityLabel="تجربة الحلاق"
            accessibilityState={{ selected: persona === 'barber' }}
            onPress={() => setPersona('barber')}
            style={[styles.personaBtn, persona === 'barber' && styles.personaBtnActive]}
          >
            <Icon
              name="cut-outline"
              size={16}
              color={persona === 'barber' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[styles.personaBtnText, persona === 'barber' && styles.personaBtnTextActive]}
            >
              تجربة الحلاق
            </Text>
          </Pressable>
        </View>

        {/* Live Interactive Simulator Widget */}
        {persona === 'customer' ? (
          <View style={styles.simulatorCard}>
            <View style={styles.simHeader}>
              <View style={styles.simBadge}>
                <Icon name="flash" size={13} color={colors.accentText} />
                <Text style={styles.simBadgeText}>محاكاة حية تفاعلية</Text>
              </View>
              <Text style={styles.simShopName}>صالون الملوك · الجزائر العاصمة</Text>
            </View>

            {/* Step 1: Services */}
            <Text style={styles.simStepLabel}>١. اختر الخدمة المرغوبة:</Text>
            <View style={styles.servicesGrid}>
              {DEMO_SERVICES.map((s) => {
                const isSelected = selectedService.id === s.id;
                return (
                  <Pressable
                    key={s.id}
                    testID={`service-chip-${s.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={s.name}
                    onPress={() => setSelectedService(s)}
                    style={[styles.serviceChip, isSelected && styles.serviceChipActive]}
                  >
                    <Text
                      style={[styles.serviceChipName, isSelected && styles.serviceChipTextActive]}
                    >
                      {s.name}
                    </Text>
                    <Text
                      style={[styles.serviceChipMeta, isSelected && styles.serviceChipMetaActive]}
                    >
                      {s.price} · {s.duration}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Step 2: Time Slots */}
            <Text style={styles.simStepLabel}>٢. اختر الوقت المتاح اليوم:</Text>
            <View style={styles.slotsRow}>
              {DEMO_SLOTS.map((slot) => {
                const isSelected = selectedSlot === slot;
                return (
                  <Pressable
                    key={slot}
                    testID={`slot-chip-${slot}`}
                    accessibilityRole="button"
                    accessibilityLabel={`الوقت ${slot}`}
                    onPress={() => setSelectedSlot(slot)}
                    style={[styles.slotChip, isSelected && styles.slotChipActive]}
                  >
                    <Text style={[styles.slotChipText, isSelected && styles.slotChipTextActive]}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Resulting Simulated Ticket */}
            <View style={styles.simResultCard}>
              <View style={styles.simResultTop}>
                <View style={styles.confirmedPill}>
                  <Icon name="checkmark-circle" size={14} color={colors.onPrimary} />
                  <Text style={styles.confirmedPillText}>موعد جاهز للتأكيد</Text>
                </View>
                <Text style={styles.simResultPrice}>{selectedService.price}</Text>
              </View>
              <Text style={styles.simResultSummary}>
                {selectedService.name} · اليوم {selectedSlot} ({selectedService.duration})
              </Text>
              <View style={styles.qrPromptRow}>
                <Icon name="qr-code-outline" size={16} color={colors.primary} />
                <Text style={styles.qrPromptText}>ستحصل فوراً على رمز QR لتأكيد حضورك عند الباب</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.simulatorCard}>
            <View style={styles.simHeader}>
              <View style={styles.simBadge}>
                <Icon name="briefcase" size={13} color={colors.accentText} />
                <Text style={styles.simBadgeText}>لوحة تحكم الصالون</Text>
              </View>
              <Text style={styles.simShopName}>إدارة المواعيد والإيراد</Text>
            </View>

            <View style={styles.barberMetricsBox}>
              <View style={styles.bMetric}>
                <Text style={styles.bMetricVal}>٦ مواعيد</Text>
                <Text style={styles.bMetricLab}>مجدولة اليوم</Text>
              </View>
              <View style={styles.bMetricDivider} />
              <View style={styles.bMetric}>
                <Text style={styles.bMetricVal}>7,800 دج</Text>
                <Text style={styles.bMetricLab}>الإيراد المتوقع</Text>
              </View>
            </View>

            <View style={styles.barberFeatureList}>
              <View style={styles.bFeatureRow}>
                <Icon name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.bFeatureText}>تحديد أوقات فراغك وساعات الاستراحة بمرونة كاملة</Text>
              </View>
              <View style={styles.bFeatureRow}>
                <Icon name="phone-portrait-outline" size={18} color={colors.primary} />
                <Text style={styles.bFeatureText}>إشعار فوري عند كل حجز جديد مع اسم الزبون وهاتفه</Text>
              </View>
              <View style={styles.bFeatureRow}>
                <Icon name="qr-code" size={18} color={colors.primary} />
                <Text style={styles.bFeatureText}>مسح سريع لرمز الزبون لتسجيل الحضور وتفادي الغياب</Text>
              </View>
            </View>
          </View>
        )}

        {/* 3 Proof Points Grid */}
        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <Icon name="speedometer-outline" size={20} color={colors.primary} />
            <Text style={styles.trustTitle}>حجز في 30 ثانية</Text>
            <Text style={styles.trustDesc}>أسرع طريقة لتثبيت موعدك</Text>
          </View>
          <View style={styles.trustItem}>
            <Icon name="shield-checkmark-outline" size={20} color={colors.primary} />
            <Text style={styles.trustTitle}>دخول موثوق بالـ QR</Text>
            <Text style={styles.trustDesc}>بدون انتظار على الكراسي</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Conversion Dock */}
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom + space[2], space[4]) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="ابدأ الآن مجاناً"
          onPress={onStart}
          style={({ pressed }) => [styles.dockPrimaryBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.dockPrimaryBtnText}>ابدأ الآن مجاناً</Text>
          <Icon name="arrow-forward" size={18} color={colors.onPrimary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تسجيل الدخول"
          onPress={onSignIn}
          style={({ pressed }) => [styles.dockSecondaryBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.dockSecondaryBtnText}>تسجيل الدخول</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  brandTitle: {
    fontFamily: typography.brand.fontFamily,
    fontSize: 24,
    color: colors.primary,
  },
  liveIndicator: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: space[2],
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  liveText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space[4],
    gap: space[4],
  },
  heroSection: {
    gap: space[1],
    alignItems: 'flex-end',
  },
  heroKicker: {
    ...typography.caption,
    color: colors.accentText,
    fontWeight: '700',
  },
  heroHeadline: {
    fontFamily: typography.title.fontFamily,
    fontSize: 24,
    lineHeight: 34,
    color: colors.text,
    textAlign: 'right',
  },
  heroBody: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'right',
  },
  personaSwitch: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    padding: space[1],
    gap: space[1],
  },
  personaBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[2],
    borderRadius: radii.pill,
  },
  personaBtnActive: {
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  personaBtnText: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.textMuted,
  },
  personaBtnTextActive: {
    color: colors.primary,
  },
  simulatorCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: space[3],
    ...elevation.card,
  },
  simHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: space[2],
  },
  simBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  simBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.accentText,
    fontWeight: '600',
  },
  simShopName: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
  },
  simStepLabel: {
    ...typography.label,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  servicesGrid: {
    gap: space[2],
  },
  serviceChip: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  serviceChipName: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
  },
  serviceChipTextActive: {
    color: colors.primary,
  },
  serviceChipMeta: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  serviceChipMetaActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  slotsRow: {
    flexDirection: 'row-reverse',
    gap: space[2],
  },
  slotChip: {
    flex: 1,
    paddingVertical: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotChipText: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
  },
  slotChipTextActive: {
    color: colors.onPrimary,
  },
  simResultCard: {
    backgroundColor: '#F7FAF9',
    borderRadius: radii.lg,
    padding: space[3],
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 120, 0.25)',
    gap: space[2],
  },
  simResultTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmedPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  confirmedPillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.onPrimary,
    fontWeight: '600',
  },
  simResultPrice: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.primary,
  },
  simResultSummary: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  qrPromptRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  qrPromptText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    textAlign: 'right',
    flex: 1,
  },
  barberMetricsBox: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: space[3],
  },
  bMetric: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  bMetricVal: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.primary,
  },
  bMetricLab: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  bMetricDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  barberFeatureList: {
    gap: space[2],
  },
  bFeatureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  bFeatureText: {
    ...typography.body,
    fontSize: 13,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  trustGrid: {
    flexDirection: 'row-reverse',
    gap: space[3],
  },
  trustItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-end',
    gap: 4,
  },
  trustTitle: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  trustDesc: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row-reverse',
    gap: space[2],
    alignItems: 'center',
  },
  dockPrimaryBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: colors.primary,
    minHeight: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  dockPrimaryBtnText: {
    ...typography.button,
    color: colors.onPrimary,
    fontSize: 15,
  },
  dockSecondaryBtn: {
    paddingHorizontal: space[3],
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockSecondaryBtnText: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.textMuted,
  },
  btnPressed: {
    opacity: 0.85,
  },
});
