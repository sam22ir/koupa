import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from 'heroui-native/text';

import { colors, layout, radii, space, typography } from '@/src/theme';

import { BrandLogo } from './BrandLogo';
import { Stage } from './Stage';

export type PageHeaderTone = 'stage' | 'paper' | 'main';

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly context?: string;
  readonly trailing?: ReactNode;
  readonly tone?: PageHeaderTone;
};

/** Brand masthead used by secondary screens in both role workspaces. */
export function CustomerStageHeader({ title, subtitle, context, trailing, tone = 'paper' }: Props) {
  if (tone === 'main') {
    return (
      <Stage>
        <View testID="page-header-stage" style={styles.mainRow}>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
          <View style={styles.mainTitleBlock}>
            <Text accessibilityRole="header" style={[styles.compactTitle, styles.stageTitle]}>{title}</Text>
            {subtitle ? <Text style={styles.stageSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      </Stage>
    );
  }

  const stage = tone === 'stage';
  return (
    <CompactHeader
      testID={stage ? 'page-header-stage-compact' : 'page-header-paper'}
      title={title}
      subtitle={subtitle}
      context={context}
      trailing={trailing}
      stage={stage}
    />
  );
}

function CompactHeader({
  testID,
  title,
  subtitle,
  context,
  trailing,
  stage,
}: {
  readonly testID: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly context?: string;
  readonly trailing?: ReactNode;
  readonly stage: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      style={[
        styles.compact,
        stage ? styles.compactStage : styles.compactPaper,
        { paddingTop: Math.max(insets.top, layout.screenPaddingTop) + (stage ? space[2] : 0) },
      ]}
    >
      <PageHeaderIdentity context={context} trailing={trailing} stage={stage} />
      <View style={styles.titleBlock}>
        <Text
          accessibilityRole="header"
          style={[styles.compactTitle, stage ? styles.stageTitle : styles.paperTitle]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.compactSubtitle, stage ? styles.stageSubtitle : styles.paperSubtitle]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function PageHeaderIdentity({
  context,
  trailing,
  stage = false,
}: {
  readonly context?: string;
  readonly trailing?: ReactNode;
  readonly stage?: boolean;
}) {
  return (
    <View style={styles.identityRow}>
      <View style={styles.identityGroup}>
        <BrandLogo
          height={28}
          imageStyle={stage ? { tintColor: colors.onPrimary } : undefined}
        />
        {context ? (
          <View style={[styles.contextLabel, stage ? styles.contextLabelStage : styles.contextLabelPaper]}>
            <Typography
              type="body-xs"
              style={[styles.contextText, stage ? styles.contextTextStage : styles.contextTextPaper]}
            >
              {context}
            </Typography>
          </View>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mainRow: {
    minHeight: 52,
    gap: space[3],
  },
  mainTitleBlock: {
    gap: space[1],
    alignItems: 'flex-end',
  },
  compact: {
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[6],
  },
  compactPaper: {
    backgroundColor: colors.background,
  },
  compactStage: {
    backgroundColor: colors.stage,
    // Room for the body's first card to float over the lower edge.
    paddingBottom: space[6] - layout.stageBodyOverlap,
    borderBottomLeftRadius: radii['3xl'],
    borderBottomRightRadius: radii['3xl'],
    overflow: 'hidden',
  },
  identityRow: {
    minHeight: 32,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  identityGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  contextLabel: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: space[2],
    borderRadius: 8,
  },
  contextLabelPaper: {
    backgroundColor: colors.primarySoft,
  },
  contextLabelStage: {
    backgroundColor: colors.stageOverlay,
  },
  contextText: {
    fontFamily: typography.body.fontFamily,
  },
  contextTextPaper: {
    color: colors.primary,
  },
  contextTextStage: {
    color: colors.onPrimary,
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  titleBlock: {
    marginTop: space[4],
    gap: space[2],
    alignItems: 'flex-end',
  },
  compactTitle: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 36,
    textAlign: 'right',
  },
  compactSubtitle: {
    ...typography.body,
    textAlign: 'right',
  },
  stageTitle: {
    color: colors.onPrimary,
  },
  stageSubtitle: {
    ...typography.body,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
  },
  paperTitle: {
    color: colors.text,
  },
  paperSubtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
});
