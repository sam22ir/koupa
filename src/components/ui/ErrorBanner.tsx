import { Alert } from 'heroui-native/alert';

import { formatAppError } from '@/src/i18n/errors';

type Props = {
  readonly error: unknown;
};

export function ErrorBanner({ error }: Props) {
  if (!error) return null;
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{formatAppError(error)}</Alert.Title>
      </Alert.Content>
    </Alert>
  );
}