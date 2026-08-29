import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLogo, Icon } from '@/src/components/ui';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

import { ImpeccableWelcome } from './ImpeccableWelcome';
import { ProMaxUtilityWelcome } from './ProMaxUtilityWelcome';
import { TasteEditorialWelcome } from './TasteEditorialWelcome';
import { welcomeProposals, type WelcomeProposalId } from './types';

export function WelcomeProposalPicker() {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<WelcomeProposalId | null>(null);

  if (active === 'impeccable') {
    return <ImpeccableWelcome onBack={() => setActive(null)} />;
  }
  if (active === 'taste') {
    return <TasteEditorialWelcome onBack={() => setActive(null)} />;
  }
  if (active === 'pro-max') {
    return <ProMaxUtilityWelcome onBack={() => setActive(null)} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top + space[3], space[6]),
            paddingBottom: insets.bottom + space[6],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.header}>
          <BrandLogo variant="mark" height={44} />
          <Text style={styles.brandTitle}>كوپا</Text>
          <Text style={styles.headerSubtitle}>مقترحات تصميم صفحة الترحيب (Welcome Screen)</Text>
          <Text style={styles.headerDescription}>
            ثلاث رؤى تصميمية متكاملة ومستقلة، مصاغة حسب أحدث معايير تجربة المستخدم والهوية البصرية لتطبيق كوپا.
          </Text>
        </View>

        {/* Proposals List */}
        <View style={styles.proposalsList}>
          {welcomeProposals.map((item, index) => (
            <Pressable
              key={item.id}
              testID={`proposal-card-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`فتح مقترح ${item.titleAr}`}
              onPress={() => setActive(item.id)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
                <View style={styles.indexCircle}>
                  <Text style={styles.indexText}>{index + 1}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitleAr}>{item.titleAr}</Text>
                <Text style={styles.cardSubtitleAr}>{item.subtitleAr}</Text>
                <Text style={styles.cardPitch}>{item.pitch}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.ctaBtn}>
                  <Text style={styles.ctaBtnText}>معاينة التصميم الحي</Text>
                  <Icon name="arrow-back" size={16} color={colors.primary} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default WelcomeProposalPicker;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: layout.screenPaddingX,
    gap: space[5],
  },
  header: {
    alignItems: 'center',
    gap: space[2],
  },
  brandTitle: {
    fontFamily: typography.brand.fontFamily,
    fontSize: 32,
    color: colors.primary,
  },
  headerSubtitle: {
    ...typography.bodyStrong,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  headerDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: '94%',
  },
  proposalsList: {
    gap: space[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: space[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: space[3],
    ...elevation.card,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indexCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 14,
  },
  badgePill: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: space[3],
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.accentText,
    fontWeight: '700',
  },
  cardBody: {
    gap: 4,
    alignItems: 'flex-end',
  },
  cardTitleAr: {
    fontFamily: typography.title.fontFamily,
    fontSize: 18,
    color: colors.text,
    textAlign: 'right',
  },
  cardSubtitleAr: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  cardPitch: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: space[1],
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space[3],
    alignItems: 'flex-start',
  },
  ctaBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  ctaBtnText: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.primary,
  },
});
