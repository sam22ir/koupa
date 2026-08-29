import { fireEvent, render } from '@testing-library/react-native';

import {
  ImpeccableWelcome,
  ProMaxUtilityWelcome,
  TasteEditorialWelcome,
  WelcomeProposalPicker,
} from '../src/design-proposals/welcome';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

describe('Welcome Design Proposals', () => {
  it('renders the Impeccable design and toggles dual pillar tabs', async () => {
    const onStart = jest.fn();
    const onSignIn = jest.fn();
    const onBack = jest.fn();

    const view = await render(
      <ImpeccableWelcome onStart={onStart} onSignIn={onSignIn} onBack={onBack} />,
    );

    expect(view.getByText('كوپا')).toBeTruthy();
    expect(view.getByText('احجز وقتك بدقة، دون انتظار')).toBeTruthy();
    expect(view.getByText('0 دقيقة')).toBeTruthy();
    expect(view.getByText('100%')).toBeTruthy();
    expect(view.getByText('QR فوري')).toBeTruthy();

    // Default is Customer tab
    expect(view.getByText('حجز فوري مؤكد')).toBeTruthy();

    // Switch to Barber tab
    await fireEvent.press(view.getByText('لأصحاب الصالونات'));
    expect(view.getByText('إدارة متكاملة لصالونك')).toBeTruthy();

    // Fire CTAs
    await fireEvent.press(view.getByRole('button', { name: /ابدأ الآن/ }));
    expect(onStart).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'لدي حساب بالفعل · تسجيل الدخول' }));
    expect(onSignIn).toHaveBeenCalledTimes(1);

    await fireEvent.press(view.getByRole('button', { name: 'رجوع إلى المقترحات' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the Taste Editorial design and its narrative chapters', async () => {
    const onStart = jest.fn();
    const onSignIn = jest.fn();

    const view = await render(
      <TasteEditorialWelcome onStart={onStart} onSignIn={onSignIn} />,
    );

    expect(view.getByText('كوپا')).toBeTruthy();
    expect(view.getByText('مختارات الحلاقة والعناية')).toBeTruthy();
    expect(view.getByText(/طقس حلاقة استثنائي/)).toBeTruthy();
    expect(view.getByText('الاختيار المستنير')).toBeTruthy();
    expect(view.getByText('الموعد المحجوز')).toBeTruthy();
    expect(view.getByText('الوصول السلس')).toBeTruthy();
    expect(view.getByText('تذكرة مؤكدة')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'استكشف التجربة وابدأ' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders the UI/UX Pro Max design and runs live simulation interactions', async () => {
    const onStart = jest.fn();

    const view = await render(
      <ProMaxUtilityWelcome onStart={onStart} />,
    );

    expect(view.getByText('كوپا')).toBeTruthy();
    expect(view.getByText('جرب سهولة الحجز مع كوپا الآن')).toBeTruthy();
    expect(view.getByText('محاكاة حية تفاعلية')).toBeTruthy();

    // Tap different service chip
    await fireEvent.press(view.getByTestId('service-chip-2'));
    expect(view.getAllByText(/800 دج/).length).toBeGreaterThan(0);

    // Tap different time slot
    await fireEvent.press(view.getByTestId('slot-chip-16:45'));

    // Switch persona to Barber
    await fireEvent.press(view.getByTestId('persona-tab-barber'));
    expect(view.getByText('لوحة تحكم الصالون')).toBeTruthy();
    expect(view.getByText('٦ مواعيد')).toBeTruthy();

    // Sticky CTA
    await fireEvent.press(view.getByLabelText('ابدأ الآن مجاناً'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('renders the WelcomeProposalPicker and navigates across proposals', async () => {
    const view = await render(<WelcomeProposalPicker />);

    expect(view.getByText('مقترحات تصميم صفحة الترحيب (Welcome Screen)')).toBeTruthy();
    expect(view.getByText('الدقة المعمارية (Impeccable)')).toBeTruthy();
    expect(view.getByText('الذوق الرفيع (Editorial Taste)')).toBeTruthy();
    expect(view.getByText('الأداء التفاعلي الأقصى (UI/UX Pro Max)')).toBeTruthy();

    // Open Proposal 1
    await fireEvent.press(view.getByTestId('proposal-card-impeccable'));
    expect(view.getByText('احجز وقتك بدقة، دون انتظار')).toBeTruthy();

    // Go back to picker
    await fireEvent.press(view.getByRole('button', { name: 'رجوع إلى المقترحات' }));
    expect(view.getByText('مقترحات تصميم صفحة الترحيب (Welcome Screen)')).toBeTruthy();

    // Open Proposal 2
    await fireEvent.press(view.getByTestId('proposal-card-taste'));
    expect(view.getByText('مختارات الحلاقة والعناية')).toBeTruthy();

    // Go back
    await fireEvent.press(view.getByRole('button', { name: 'رجوع إلى المقترحات' }));

    // Open Proposal 3
    await fireEvent.press(view.getByTestId('proposal-card-pro-max'));
    expect(view.getByText('جرب سهولة الحجز مع كوپا الآن')).toBeTruthy();
  });
});
