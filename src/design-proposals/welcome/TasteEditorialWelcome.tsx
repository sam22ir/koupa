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
 * Concept 2: "Taste" (الذوق الرفيع واللمسة التحريرية)
 * - Warm editorial parchment aesthetic.
 * - Narrative 3-chapter storytelling of the grooming ritual.
 * - Artisanal ticket simulation with subtle gold details.
 */
export function TasteEditorialWelcome({ onStart, onSignIn, onBack }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Editorial Top Masthead */}
      <View style={[styles.masthead, { paddingTop: Math.max(insets.top + space[2], space[4]) }]}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع إلى المقترحات"
            onPress={onBack}
            style={styles.backChip}
          >
            <Icon name="arrow-back" size={16} color={colors.accentText} />
            <Text style={styles.backChipText}>المقترحات</Text>
          </Pressable>
        ) : (
          <View style={styles.badgePlaceholder} />
        )}
        <View style={styles.brandLockup}>
          <Text style={styles.brandTitle}>كوپا</Text>
          <Text style={styles.brandTagline}>مختارات الحلاقة والعناية</Text>
        </View>
        <View style={styles.sealEmblem}>
          <BrandLogo variant="mark" height={28} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space[8] }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Statement Quote Card */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteMark}>“</Text>
          <Text style={styles.quoteText}>
            طقس حلاقة استثنائي... يبدأ من حجز مدروس، وموعد محترم بالدقيقة.
          </Text>
          <View style={styles.quoteAuthorRow}>
            <View style={styles.goldDot} />
            <Text style={styles.quoteAuthor}>فلسفة كوپا في تنظيم الوقت</Text>
          </View>
        </View>

        {/* The 3-Chapter Narrative */}
        <View style={styles.chaptersSection}>
          <Text style={styles.sectionHeader}>فصول التجربة</Text>

          {/* Chapter 1 */}
          <View style={styles.chapterCard}>
            <View style={styles.chapterNumberBadge}>
              <Text style={styles.chapterNumberText}>١</Text>
            </View>
            <View style={styles.chapterCopy}>
              <Text style={styles.chapterTitle}>الاختيار المستنير</Text>
              <Text style={styles.chapterBody}>
                تصفح نخبة الصالونات، اطّلع على الأعمال وقوائم الخدمات والأسعار المسبقة بكل شفافية.
              </Text>
            </View>
          </View>

          {/* Chapter 2 */}
          <View style={styles.chapterCard}>
            <View style={styles.chapterNumberBadge}>
              <Text style={styles.chapterNumberText}>٢</Text>
            </View>
            <View style={styles.chapterCopy}>
              <Text style={styles.chapterTitle}>الموعد المحجوز</Text>
              <Text style={styles.chapterBody}>
                اختر وقتك المناسب بدقة دون مكالمات متكررة أو الانتظار العشوائي على مقاعد الانتظار.
              </Text>
            </View>
          </View>

          {/* Chapter 3 */}
          <View style={styles.chapterCard}>
            <View style={styles.chapterNumberBadge}>
              <Text style={styles.chapterNumberText}>٣</Text>
            </View>
            <View style={styles.chapterCopy}>
              <Text style={styles.chapterTitle}>الوصول السلس</Text>
              <Text style={styles.chapterBody}>
                امسح رمز QR عند وصولك، لتبدأ جلستك فوراً في الوقت المحدد بدقة واحترافية.
              </Text>
            </View>
          </View>
        </View>

        {/* Artisanal Ticket Preview */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketTop}>
            <View style={styles.ticketStamp}>
              <Text style={styles.ticketStampText}>تذكرة مؤكدة</Text>
            </View>
            <Text style={styles.ticketShop}>صالون الأناقة · وهران</Text>
          </View>
          <View style={styles.ticketDivider} />
          <View style={styles.ticketBottom}>
            <Text style={styles.ticketMeta}>السبت · 16:30 · قص شعر كلاسيكي</Text>
            <Text style={styles.ticketPrice}>1,200 دج</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={onStart}
            style={({ pressed }) => [styles.editorialPrimaryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.editorialPrimaryBtnText}>استكشف التجربة وابدأ</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onSignIn}
            style={({ pressed }) => [styles.editorialSecondaryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.editorialSecondaryBtnText}>أنا عضو مسجل · الدخول</Text>
          </Pressable>
        </View>

        {/* Colophon */}
        <Text style={styles.footnote}>
          صُنعت بعناية لتقديم تجربة حلاقة تليق بك
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9F8F5',
  },
  masthead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[4],
    backgroundColor: '#F9F8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1D8',
  },
  brandLockup: {
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: typography.brand.fontFamily,
    fontSize: 26,
    color: colors.primary,
    letterSpacing: 0.5,
  },
  brandTagline: {
    ...typography.caption,
    fontSize: 12,
    color: colors.accentText,
    marginTop: -2,
  },
  sealEmblem: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 122, 120, 0.2)',
  },
  backChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: space[3],
    paddingVertical: space[1],
    borderRadius: radii.pill,
  },
  backChipText: {
    ...typography.caption,
    color: colors.accentText,
    fontWeight: '600',
  },
  badgePlaceholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space[5],
    gap: space[5],
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: space[5],
    borderWidth: 1,
    borderColor: '#E6E1D8',
    ...elevation.card,
  },
  quoteMark: {
    fontSize: 38,
    lineHeight: 38,
    color: colors.accent,
    fontFamily: typography.title.fontFamily,
    marginBottom: -10,
    textAlign: 'right',
  },
  quoteText: {
    ...typography.bodyStrong,
    fontSize: 17,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'right',
  },
  quoteAuthorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[3],
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  quoteAuthor: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  chaptersSection: {
    gap: space[3],
  },
  sectionHeader: {
    ...typography.label,
    fontSize: 14,
    color: colors.accentText,
    textAlign: 'right',
    marginBottom: space[1],
  },
  chapterCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[3],
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    padding: space[4],
    borderWidth: 1,
    borderColor: '#E6E1D8',
  },
  chapterNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterNumberText: {
    ...typography.bodyStrong,
    color: colors.accentText,
    fontSize: 15,
  },
  chapterCopy: {
    flex: 1,
    alignItems: 'flex-end',
  },
  chapterTitle: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  chapterBody: {
    ...typography.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: '#FAF5EE',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#DFD5C4',
    borderStyle: 'dashed',
    padding: space[4],
    gap: space[2],
  },
  ticketTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketStamp: {
    backgroundColor: colors.accent,
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  ticketStampText: {
    ...typography.caption,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ticketShop: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  ticketDivider: {
    height: 1,
    backgroundColor: '#DFD5C4',
    marginVertical: space[1],
  },
  ticketBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  ticketPrice: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 15,
  },
  actions: {
    marginTop: space[2],
    gap: space[2],
  },
  editorialPrimaryBtn: {
    backgroundColor: colors.primary,
    minHeight: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialPrimaryBtnText: {
    ...typography.button,
    color: colors.onPrimary,
    fontSize: 15,
  },
  editorialSecondaryBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialSecondaryBtnText: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.textMuted,
  },
  btnPressed: {
    opacity: 0.85,
  },
  footnote: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: space[2],
  },
});
