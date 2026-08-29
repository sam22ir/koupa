import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import IntroScreen from '../app/(auth)/intro';
import { colors } from '../src/theme';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

const mockRouter = router as unknown as { push: jest.Mock };

/** The Image inside the brand lockup, so we can assert which artwork is shown. */
function logoImageOf(view: Awaited<ReturnType<typeof render>>) {
  const brand = view.getByLabelText('كوپا');
  const child = Array.isArray(brand.props.children) ? brand.props.children[0] : brand.props.children;
  return child;
}

describe('IntroScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('states the idea as three beats and one sentence', async () => {
    const view = await render(<IntroScreen />);

    expect(view.getByTestId('intro-beat-find')).toHaveTextContent('اعثر');
    expect(view.getByTestId('intro-beat-book')).toHaveTextContent('احجز');
    expect(view.getByTestId('intro-beat-track')).toHaveTextContent('تابع');
    expect(view.getByTestId('intro-body')).toHaveTextContent(
      'حلاقون قريبون منك، موعد مؤكد برقم ووقت، وكل مواعيدك في مكان واحد.',
    );
  });

  it('puts the accent teal on the payoff beat only', async () => {
    const view = await render(<IntroScreen />);

    expect(StyleSheet.flatten(view.getByTestId('intro-beat-track').props.style).color).toBe(
      colors.primary,
    );
    expect(StyleSheet.flatten(view.getByTestId('intro-beat-find').props.style).color).toBe(
      colors.text,
    );
  });

  it('asks for nothing yet: no role choice on the intro', async () => {
    const view = await render(<IntroScreen />);

    expect(view.queryByText('اختر نوع الحساب')).toBeNull();
    expect(view.queryByTestId('welcome-role-cards')).toBeNull();
  });

  it('uses the canonical teal brand lockup, same as the auth header', async () => {
    const view = await render(<IntroScreen />);
    const image = logoImageOf(view);

    expect(image.props.source).toEqual(require('../assets/brand/logo-512.png'));
    expect(image.props.tintColor).toBe(colors.primary);
  });

  it('carries exactly one primary action', async () => {
    const view = await render(<IntroScreen />);

    expect(view.getAllByRole('button')).toHaveLength(1);
  });

  it('starts the flow by opening the choose-path screen', async () => {
    const view = await render(<IntroScreen />);

    fireEvent.press(view.getByTestId('intro-start'));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/welcome',
      params: {},
    });
  });

  it('lets an existing account skip straight to sign-in', async () => {
    const view = await render(<IntroScreen />);

    fireEvent.press(view.getByRole('link', { name: 'لدي حساب بالفعل' }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/sign-in',
      params: {},
    });
  });
});
