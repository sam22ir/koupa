import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, sample, tabs } from './shared';

type Props = {
  onBack?: () => void;
};

export function CalmCounterHome({ onBack }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.page}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backChip} accessibilityRole="button">
              <Text style={styles.backText}>المقترحات</Text>
            </Pressable>
          ) : (
            <View style={styles.backChipPlaceholder} />
          )}
          <View style={styles.brandBlock}>
            <Text style={styles.brand}>كوپا</Text>
            <Text style={styles.brandCaption}>احجز وقتك بوضوح</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>أ</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.greeting}>{sample.greeting}</Text>
          <Text style={styles.subtitle}>{sample.subtitle}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.meta}>{sample.date}</Text>
            <View style={styles.status}>
              <Text style={styles.statusText}>{sample.status}</Text>
            </View>
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
          <View style={styles.details}>
            <Meta label="الوقت" value={sample.time} />
            <Meta label="المدة" value={sample.duration} />
            <Meta label="السعر" value={sample.price} />
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>تفاصيل الموعد</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>إدارة الموعد</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>اختصر الطريق</Text>
          <Text style={styles.sectionBody}>اعثر على حلاق يناسب وقتك ومكانك.</Text>
        </View>

        <Pressable style={styles.searchLaunch}>
          <Text style={styles.searchAction}>اكتشف</Text>
          <Text style={styles.searchPlaceholder}>ابحث عن حلاق أو محل</Text>
        </Pressable>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickLink}>
            <Text style={styles.quickTitle}>حلاقون</Text>
            <Text style={styles.quickBody}>اختيار حسب الوقت</Text>
          </Pressable>
          <Pressable style={styles.quickLink}>
            <Text style={styles.quickTitle}>مواعيدي</Text>
            <Text style={styles.quickBody}>كل حجوزاتك</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.id === 'home';
          return (
            <View key={tab.id} style={styles.tabItem}>
              <View style={[styles.tabMark, active && styles.tabMarkActive]} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.background,
  },
  page: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBlock: {
    alignItems: 'flex-end',
    flex: 1,
    marginHorizontal: 10,
  },
  brand: {
    color: brand.text,
    fontSize: 28,
    fontWeight: '700',
  },
  brandCaption: {
    color: brand.muted,
    fontSize: 12,
    marginTop: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  backChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: brand.surface,
    borderWidth: 1,
    borderColor: brand.border,
  },
  backChipPlaceholder: {
    width: 64,
  },
  backText: {
    color: brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  intro: {
    alignItems: 'flex-end',
    gap: 4,
  },
  greeting: {
    color: brand.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    color: brand.muted,
    fontSize: 15,
    textAlign: 'right',
  },
  card: {
    backgroundColor: brand.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 18,
    gap: 14,
  },
  cardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    color: brand.muted,
    fontSize: 13,
  },
  status: {
    backgroundColor: brand.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    color: '#8A5A18',
    fontSize: 12,
    fontWeight: '700',
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
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontSize: 16,
    fontWeight: '700',
  },
  personShop: {
    color: brand.muted,
    fontSize: 13,
  },
  details: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: brand.border,
    paddingTop: 12,
  },
  metaCell: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  metaLabel: {
    color: brand.muted,
    fontSize: 11,
  },
  metaValue: {
    color: brand.text,
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: brand.primary,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: brand.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: brand.surface,
  },
  secondaryBtnText: {
    color: brand.text,
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sectionTitle: {
    color: brand.text,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionBody: {
    color: brand.muted,
    fontSize: 13,
  },
  searchLaunch: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8EEF0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  searchPlaceholder: {
    color: brand.muted,
    fontSize: 14,
  },
  searchAction: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  quickRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    paddingTop: 14,
  },
  quickLink: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  quickTitle: {
    color: brand.text,
    fontSize: 15,
    fontWeight: '700',
  },
  quickBody: {
    color: brand.muted,
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: brand.border,
    backgroundColor: brand.surface,
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  tabMark: {
    width: 18,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  tabMarkActive: {
    backgroundColor: brand.primary,
  },
  tabLabel: {
    color: brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: brand.primary,
  },
});
