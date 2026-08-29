import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from 'heroui-native/text';

import { colors, layout, space, typography } from '@/src/theme';

import { Stage } from './Stage';

export type PageHeaderTone = 'stage' | 'paper';

type Props = {
  readonly title: string;
  readonly subtitle?: string;
  readonly trailing?: ReactNode;
  readonly tone?: PageHeaderTone;
};

/** Shared page header. Paper is the default; teal is reserved for product moments. */
export function CustomerStageHeader({ title, subtitle, trailing, tone = 'paper' }: Props) {
  if (tone === 'stage') {
    return (
      <Stage>
        <View testID="page-header-stage" style={styles.stageRow}>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
          <View style={styles.titleBlock}>
            <Typography type="h4" align="end" style={styles.stageTitle}>{title}</Typography>
            {subtitle ? <Typography type="body" align="end" style={styles.stageSubtitle}>{subtitle}</Typography> : null}
          </View>
        </View>
      </Stage>
    );
  }

  return <PaperHeader title={title} subtitle={subtitle} trailing={trailing} />;
}

function PaperHeader({
  title,
  subtitle,
  trailing,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly trailing?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="page-header-paper"
      style={[styles.paper, { paddingTop: Math.max(insets.top, layout.screenPaddingTop) }]}
    >
      <View style={styles.paperRow}>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        <View style={styles.titleBlock}>
          <Typography type="h4" align="end" style={styles.paperTitle}>{title}</Typography>
          {subtitle ? <Typography type="body" align="end" style={styles.paperSubtitle}>{subtitle}</Typography> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stageRow: {
    minHeight: 52,
    gap: space[3],
  },
  paper: {
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[4],
  },
  paperRow: {
    minHeight: 44,
    gap: space[3],
  },
  trailing: {
    alignSelf: 'flex-start',
  },
  titleBlock: {
    gap: space[1],
    alignItems: 'flex-end',
  },
  stageTitle: {
    color: colors.onPrimary,
  },
  stageSubtitle: {
    ...typography.body,
    color: colors.onPrimaryMuted,
  },
  paperTitle: {
    color: colors.text,
  },
  paperSubtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
});