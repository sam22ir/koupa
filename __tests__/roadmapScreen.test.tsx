import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import RoadmapScreen from '@/app/roadmap';

const mockLoadRoadmap = jest.fn();
const mockSetVote = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    router: { push: jest.fn(), dismissTo: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
    useFocusEffect: (callback: () => void) => ReactModule.useEffect(callback, [callback]),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 24, right: 0, bottom: 16, left: 0 }),
  SafeAreaListener: ({ children }: any) => children ?? null,
}));

jest.mock('@/src/providers/SessionProvider', () => ({
  useAppSession: () => ({ profile: { role: 'customer' } }),
}));

jest.mock('@/src/services/roadmap', () => ({
  loadRoadmap: (...args: unknown[]) => mockLoadRoadmap(...args),
  setRoadmapVote: (...args: unknown[]) => mockSetVote(...args),
}));

const items = [
  { id: 'rate', title: 'تقييم الحلاق بعد الزيارة', description: 'قيّم تجربتك', icon: 'star-outline', status: 'soon' as const, voteCount: 4, hasVoted: false },
  { id: 'fav', title: 'الحلاقون المفضلون', description: '', icon: 'heart-outline', status: 'planned' as const, voteCount: 0, hasVoted: false },
];

describe('roadmap screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadRoadmap.mockResolvedValue(items);
    mockSetVote.mockResolvedValue(5);
  });

  it('groups features by status', async () => {
    await render(<RoadmapScreen />);

    expect(await screen.findByText('تقييم الحلاق بعد الزيارة')).toBeTruthy();
    expect(screen.getByText('الحلاقون المفضلون')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'قريبا' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'مخطط' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'قيد التنفيذ' })).toBeNull();
  });

  it('votes for a feature and shows the new total', async () => {
    await render(<RoadmapScreen />);
    await screen.findByText('تقييم الحلاق بعد الزيارة');

    await fireEvent.press(screen.getByTestId('roadmap-vote-rate'));

    await waitFor(() => expect(mockSetVote).toHaveBeenCalledWith('rate', true));
    expect(await screen.findByText('صوّتَّ لهذه الميزة')).toBeTruthy();
  });

  it('takes the vote back and shows an error when saving fails', async () => {
    mockSetVote.mockRejectedValueOnce(new Error('Network request failed'));
    await render(<RoadmapScreen />);
    await screen.findByText('تقييم الحلاق بعد الزيارة');

    await fireEvent.press(screen.getByTestId('roadmap-vote-rate'));

    expect(await screen.findByText('تحقق من الاتصال بالإنترنت')).toBeTruthy();
    expect(screen.queryByText('صوّتَّ لهذه الميزة')).toBeNull();
  });

  it('shows an empty state when nothing is listed', async () => {
    mockLoadRoadmap.mockResolvedValueOnce([]);
    await render(<RoadmapScreen />);

    expect(await screen.findByText('لا توجد ميزات معروضة الآن.')).toBeTruthy();
  });
});
