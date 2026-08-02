import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CalmCounterHome } from './CalmCounterHome';
import { ShopLedgerHome } from './ShopLedgerHome';
import { TealStageHome } from './TealStageHome';
import { brand } from './shared';
import { proposals, type ProposalId } from './types';

export default function ProposalPicker() {
  const [active, setActive] = useState<ProposalId | null>(null);

  if (active === 'calm-counter') {
    return <CalmCounterHome onBack={() => setActive(null)} />;
  }
  if (active === 'teal-stage') {
    return <TealStageHome onBack={() => setActive(null)} />;
  }
  if (active === 'shop-ledger') {
    return <ShopLedgerHome onBack={() => setActive(null)} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.brand}>كوپا</Text>
        <Text style={styles.title}>Design proposals</Text>
        <Text style={styles.subtitle}>
          Three directions for Customer Home — same content, same brand palette. Tap one to preview.
        </Text>

        <View style={styles.paletteRow}>
          <Swatch hex={brand.primary} label="Teal" />
          <Swatch hex={brand.accent} label="Gold" />
          <Swatch hex={brand.text} label="Ink" />
          <Swatch hex={brand.background} label="BG" bordered />
        </View>

        {proposals.map((proposal, index) => (
          <Pressable
            key={proposal.id}
            accessibilityRole="button"
            onPress={() => setActive(proposal.id)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardIndex}>
              <Text style={styles.cardIndexText}>{index + 1}</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{proposal.title}</Text>
              <Text style={styles.cardTitleAr}>{proposal.titleAr}</Text>
              <Text style={styles.cardPitch}>{proposal.pitch}</Text>
            </View>
            <Text style={styles.cardCta}>Open</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function Swatch({
  hex,
  label,
  bordered,
}: {
  hex: string;
  label: string;
  bordered?: boolean;
}) {
  return (
    <View style={styles.swatchBlock}>
      <View
        style={[
          styles.swatch,
          { backgroundColor: hex },
          bordered && styles.swatchBorder,
        ]}
      />
      <Text style={styles.swatchLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.background,
  },
  scroll: {
    padding: 24,
    paddingTop: 48,
    gap: 14,
  },
  brand: {
    color: brand.primary,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: brand.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: brand.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  swatchBlock: {
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  swatchBorder: {
    borderWidth: 1,
    borderColor: brand.border,
  },
  swatchLabel: {
    color: brand.muted,
    fontSize: 11,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: brand.border,
    padding: 16,
  },
  pressed: {
    opacity: 0.88,
  },
  cardIndex: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIndexText: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: brand.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardTitleAr: {
    color: brand.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  cardPitch: {
    color: brand.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  cardCta: {
    color: brand.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
