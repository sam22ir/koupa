import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, sample, tabs } from './shared';

type Props = {
  onBack?: () => void;
};

export function TealStageHome({ onBack }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <View style={styles.stageDecor} />
        <View style={styles.stageTop}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backChip} accessibilityRole="button">
              <Text style={styles.backText}>المقترحات</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <Text style={styles.brand}>كوپا</Text>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>أ</Text>
          </View>
        </View>
        <View style={styles.stageCopy}>
          <View style={styles.goldBar} />
          <Text style={styles.greeting}>{sample.greeting}</Text>
          <Text style={styles.subtitle}>{sample.subtitle}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.floatingCard}>
          <View style={styles.cardTop}>
            <View style={styles.status}>
              <Text style={styles.statusText}>{sample.status}</Text>
            </View>
            <Text style={styles.date}>{sample.date}</Text>
          </View>
          <Text style={styles.service}>{sample.service}</Text>
          <View style={styles.person}>
            <View style={styles.personAvatar}>
              <Text style={styles.personAvatarText}>{sample.barberInitials}</Text>
            </View>
            <View style={styles.personCopy}>
              <Text style={styles.personName}>{sample.barber}</Text>
              <Text style={styles.personShop}>{sample.shop}</Text>
            </View>
          </View>
          <View style={styles.chips}>
            <Chip label={sample.time} />
            <Chip label={sample.duration} />
            <Chip label={sample.price} />
          </View>
          <Pressable style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>إدارة الموعد</Text>
          </Pressable>
          <View style={styles.linkRow}>
            <Text style={styles.link}>تفاصيل</Text>
            <Text style={styles.linkDot}>·</Text>
            <Text style={styles.linkMuted}>إلغاء</Text>
          </View>
        </View>

        <View style={styles.tiles}>
          <Pressable style={styles.tile}>
            <View style={styles.tileMark} />
            <Text style={styles.tileTitle}>اكتشف حلاق</Text>
            <Text style={styles.tileBody}>حسب الوقت والمكان</Text>
          </Pressable>
          <Pressable style={styles.tile}>
            <View style={[styles.tileMark, styles.tileMarkGold]} />
            <Text style={styles.tileTitle}>مواعيدي</Text>
            <Text style={styles.tileBody}>كل الحجوزات</Text>
          </Pressable>
        </View>

        <Pressable style={styles.search}>
          <Text style={styles.searchText}>ابحث عن حلاق أو محل</Text>
        </Pressable>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.id === 'home';
          return (
            <View key={tab.id} style={styles.tabItem}>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              {active ? <View style={styles.tabUnderline} /> : <View style={styles.tabUnderlineGhost} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.background,
  },
  stage: {
    backgroundColor: brand.primary,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 54,
    overflow: 'hidden',
  },
  stageDecor: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    left: -50,
  },
  stageTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: brand.onPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: brand.onPrimary,
    fontWeight: '700',
  },
  backChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  backSpacer: {
    width: 64,
  },
  backText: {
    color: brand.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  stageCopy: {
    marginTop: 28,
    alignItems: 'flex-end',
    gap: 8,
  },
  goldBar: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: brand.accent,
  },
  greeting: {
    color: brand.onPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    color: 'rgba(243,245,247,0.86)',
    fontSize: 15,
    textAlign: 'right',
  },
  body: {
    flex: 1,
    marginTop: -36,
    paddingHorizontal: 16,
    gap: 14,
  },
  floatingCard: {
    backgroundColor: brand.surface,
    borderRadius: 22,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: brand.border,
    shadowColor: brand.text,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    backgroundColor: brand.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#8A5A18',
    fontWeight: '700',
    fontSize: 12,
  },
  date: {
    color: brand.muted,
    fontSize: 13,
  },
  service: {
    color: brand.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
  },
  person: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  personAvatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarText: {
    color: brand.primary,
    fontWeight: '700',
  },
  personCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  personName: {
    color: brand.text,
    fontWeight: '700',
    fontSize: 16,
  },
  personShop: {
    color: brand.muted,
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: brand.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {
    color: brand.text,
    fontWeight: '700',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: brand.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: brand.onPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  linkRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 8,
  },
  link: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  linkMuted: {
    color: brand.muted,
    fontSize: 13,
  },
  linkDot: {
    color: brand.border,
  },
  tiles: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  tile: {
    flex: 1,
    backgroundColor: brand.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 14,
    alignItems: 'flex-end',
    gap: 6,
  },
  tileMark: {
    width: 28,
    height: 4,
    borderRadius: 999,
    backgroundColor: brand.primary,
    marginBottom: 4,
  },
  tileMarkGold: {
    backgroundColor: brand.accent,
  },
  tileTitle: {
    color: brand.text,
    fontWeight: '700',
    fontSize: 15,
  },
  tileBody: {
    color: brand.muted,
    fontSize: 12,
  },
  search: {
    backgroundColor: brand.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-end',
  },
  searchText: {
    color: brand.muted,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row-reverse',
    backgroundColor: brand.surface,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    paddingTop: 10,
    paddingBottom: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    color: brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: brand.primary,
    fontWeight: '700',
  },
  tabUnderline: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: brand.primary,
  },
  tabUnderlineGhost: {
    width: 18,
    height: 3,
  },
});
