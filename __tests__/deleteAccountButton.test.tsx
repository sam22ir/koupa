import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { DeleteAccountButton } from '@/src/features/account/DeleteAccountButton';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

describe('DeleteAccountButton', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens a cross-platform confirmation and deletes only after approval', async () => {
    const onConfirm = jest.fn(async () => true);
    await render(<DeleteAccountButton onConfirm={onConfirm} />);

    await fireEvent.press(screen.getByRole('button', { name: 'حذف الحساب' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/ستُلغى مواعيدك القادمة/)).toBeTruthy();
    expect(screen.getByText(/قد تبقى سجلات تاريخية مجهولة الهوية/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'معلومات حذف الحساب' }));
    expect(Linking.openURL).toHaveBeenCalledWith('https://koupa-website.pages.dev/account-deletion/');

    await fireEvent.press(screen.getByRole('button', { name: 'نعم' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText(/ستُلغى مواعيدك القادمة/)).toBeNull());
  });

  it('keeps the confirmation open when deletion fails', async () => {
    const onConfirm = jest.fn(async () => false);
    await render(<DeleteAccountButton onConfirm={onConfirm} />);

    await fireEvent.press(screen.getByRole('button', { name: 'حذف الحساب' }));
    await fireEvent.press(screen.getByRole('button', { name: 'نعم' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/ستُلغى مواعيدك القادمة/)).toBeTruthy();
    expect(
      screen.getByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.'),
    ).toBeTruthy();
  });

  it('keeps the confirmation open when the deletion callback rejects', async () => {
    const onConfirm = jest.fn(async () => {
      throw new Error('network');
    });
    await render(<DeleteAccountButton onConfirm={onConfirm} />);

    await fireEvent.press(screen.getByRole('button', { name: 'حذف الحساب' }));
    await fireEvent.press(screen.getByRole('button', { name: 'نعم' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/ستُلغى مواعيدك القادمة/)).toBeTruthy();
    expect(screen.getByText('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.')).toBeTruthy();
  });
});
