import { type ViewProps } from 'react-native';
import { Card as HeroCard } from 'heroui-native/card';

import { layout } from '@/src/theme';

type Props = ViewProps & {
  readonly elevated?: boolean;
};

export function Card({ elevated, style, children, ...rest }: Props) {
  return (
    <HeroCard
      style={[{ padding: layout.cardPadding }, style]}
      className={elevated ? 'shadow-surface' : undefined}
      {...rest}
    >
      {children}
    </HeroCard>
  );
}