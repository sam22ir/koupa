import { Alert as NativeAlert, Platform } from 'react-native';

import { Alert } from '@/src/utils/alert';

const buttons = () => ({
  no: { text: 'لا', style: 'cancel' as const, onPress: jest.fn() },
  yes: { text: 'نعم', style: 'destructive' as const, onPress: jest.fn() },
});

describe('Alert wrapper', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS });
    jest.restoreAllMocks();
    delete (globalThis as { window?: unknown }).window;
  });

  it('passes straight through to the system alert on native', () => {
    const native = jest.spyOn(NativeAlert, 'alert').mockImplementation(() => undefined);
    const { no, yes } = buttons();

    Alert.alert('إلغاء', 'متأكد؟', [no, yes]);

    expect(native).toHaveBeenCalledWith('إلغاء', 'متأكد؟', [no, yes]);
  });

  describe('on web, where Alert.alert is a no-op', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web' });
    });

    it('asks with a browser confirm and runs the confirming button', () => {
      const confirm = jest.fn(() => true);
      (globalThis as { window?: unknown }).window = { confirm, alert: jest.fn() };
      const { no, yes } = buttons();

      Alert.alert('إلغاء', 'متأكد؟', [no, yes]);

      expect(confirm).toHaveBeenCalledWith('إلغاء\n\nمتأكد؟');
      expect(yes.onPress).toHaveBeenCalledTimes(1);
      expect(no.onPress).not.toHaveBeenCalled();
    });

    it('runs the cancel button when the confirm is declined', () => {
      (globalThis as { window?: unknown }).window = { confirm: jest.fn(() => false), alert: jest.fn() };
      const { no, yes } = buttons();

      Alert.alert('إلغاء', 'متأكد؟', [no, yes]);

      expect(yes.onPress).not.toHaveBeenCalled();
      expect(no.onPress).toHaveBeenCalledTimes(1);
    });

    it('shows a plain notice for a message with no choices', () => {
      const notice = jest.fn();
      (globalThis as { window?: unknown }).window = { confirm: jest.fn(), alert: notice };

      Alert.alert('تعذر التنفيذ');

      expect(notice).toHaveBeenCalledWith('تعذر التنفيذ');
    });
  });
});
