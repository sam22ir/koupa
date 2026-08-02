import { Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, nearbyBarbers, sample, tabs } from './shared';

type Props = {
  onBack?: () => void;
};

export function ShopLedgerHome({ onBack }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.page}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable onPress={onBack} style={styles.backChip} accessibilityRole="button">
              <Text style={styles.backText}>المقترحات</Text>
            </Pressable>
          ) : (
            <View style={styles.backSpacer} />
          )}
          <View style={styles.brandRow}>
            <View style={styles.cityChip}>
              <Text style={styles.cityText}>{sample.city}</Text>
            </View>
            <Text style={styles.brand}>كوپا</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>أ</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.greeting}>{sample.greeting}</Text>
          <Text style={styles.subtitle}>سجل مواعيدك في مكان واحد.</Text>
        </View>

        <View style={styles.ledger}>
          <View style={styles.goldRail} />
          <View style={styles.ledgerBody}>
            <View style={styles.ledgerTop}>
              <Text style={styles.ledgerLabel}>الموعد القادم</Text>
              <View style={styles.status}>
                <Text style={styles.statusText}>{sample.status}</Text>
              </View>
            </View>
            <Text style={styles.service}>{sample.service}</Text>
            <Text style={styles.personLine}>
              {sample.barber} · {sample.shop}
            </Text>
            <View style={styles.metaGrid}>
              <Meta label="التاريخ" value={sample.date.replace('السبت ', '')} />
              <Meta label="الوقت" value={sample.time} />
              <Meta label="المدة" value="45 د" />
              <Meta label="السعر" value={sample.price} />
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>إدارة الموعد</Text>
              </Pressable>
              <Pressable style={styles.outlineBtn}>
                <Text style={styles.outlineBtnText}>إلغاء</Text>
              </Pressable>
            </View>
            <Text style={styles.reschedule}>إعادة جدولة</Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>اكتشف</Text>
          <Text style={styles.sectionAction}>عرض الكل</Text>
        </View>

        <View style={styles.list}>
          {nearbyBarbers.map((barber, index) => (
            <View
              key={barber.id}
              style={[styles.row, index < nearbyBarbers.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowAvatar}>
                <Text style={styles.rowAvatarText}>{barber.initials}</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowName}>{barber.name}</Text>
                <Text style={styles.rowMeta}>
                  {barber.area} · ★ {barber.rating}
                </Text>
              </View>
              <Text style={styles.rowPrice}>{barber.price}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const active = tab.id === 'home';
          return (
            <View key={tab.id} style={styles.tabItem}>
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
    paddingHorizontal: 18,
    paddingTop: 16,
    gap: 16,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  brand: {
    color: brand.text,
    fontSize: 24,
    fontWeight: '700',
  },
  cityChip: {
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cityText: {
    color: brand.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: brand.primary,
    fontWeight: '700',
  },
  backChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.surface,
  },
  backSpacer: {
    width: 64,
  },
  backText: {
    color: brand.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  intro: {
    alignItems: 'flex-end',
    gap: 2,
  },
  greeting: {
    color: brand.text,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: brand.muted,
    fontSize: 13,
  },
  ledger: {
    flexDirection: 'row-reverse',
    backgroundColor: brand.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: 'hidden',
  },
  goldRail: {
    width: 5,
    backgroundColor: brand.accent,
  },
  ledgerBody: {
    flex: 1,
    padding: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  ledgerTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ledgerLabel: {
    color: brand.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  status: {
    borderWidth: 1,
    borderColor: brand.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    color: '#8A5A18',
    fontSize: 11,
    fontWeight: '700',
  },
  service: {
    color: brand.text,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'right',
  },
  personLine: {
    color: brand.muted,
    fontSize: 13,
    textAlign: 'right',
  },
  metaGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: brand.border,
    marginTop: 4,
  },
  metaCell: {
    width: '50%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'flex-end',
    gap: 3,
  },
  metaLabel: {
    color: brand.muted,
    fontSize: 11,
  },
  metaValue: {
    color: brand.text,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  primaryBtn: {
    flex: 1.3,
    backgroundColor: brand.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: brand.onPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  outlineBtn: {
    flex: 0.8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.border,
    paddingVertical: 12,
    alignItems: 'center',
  },
  outlineBtnText: {
    color: brand.text,
    fontWeight: '600',
    fontSize: 14,
  },
  reschedule: {
    color: brand.primary,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    marginTop: 2,
  },
  sectionHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: brand.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionAction: {
    color: brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    backgroundColor: brand.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  rowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowAvatarText: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  rowCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  rowName: {
    color: brand.text,
    fontWeight: '700',
    fontSize: 14,
  },
  rowMeta: {
    color: brand.muted,
    fontSize: 12,
  },
  rowPrice: {
    color: brand.text,
    fontWeight: '700',
    fontSize: 12,
  },
  tabBar: {
    flexDirection: 'row-reverse',
    borderTopWidth: 1,
    borderTopColor: brand.border,
    backgroundColor: brand.surface,
    paddingVertical: 14,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
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
});
