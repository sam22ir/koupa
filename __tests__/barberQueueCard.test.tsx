import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert as NativeAlert } from 'react-native';

import { BarberQueueCard } from '@/src/features/barber-queue/BarberQueueCard';
import type { BarberQueue } from '@/src/queue';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() } }));

const mockSetOpen = jest.fn();
const mockAddWalkin = jest.fn();
const mockUpdate = jest.fn();
let mockQueue: BarberQueue | null = null;
let mockError = '';

jest.mock('@/src/hooks/useQueue', () => ({
  useBarberQueue: () => ({
    queue: mockQueue,
    loading: false,
    error: mockError,
    pendingId: null,
    refresh: jest.fn(),
    setOpen: mockSetOpen,
    addWalkin: mockAddWalkin,
    update: mockUpdate,
  }),
}));

const services = [
  { id: 's1', name: 'حلاقة', price_dzd: 800, duration_minutes: 30 },
  { id: 's2', name: 'لحية', price_dzd: 400, duration_minutes: 15 },
];

const openQueue: BarberQueue = {
  queue_open: true,
  next_booking_at: '2026-10-01T13:30:00Z',
  services,
  entries: [
    { id: 'e1', name: 'سمير', source: 'barber', status: 'serving', service_name: 'حلاقة', joined_at: '2026-10-01T10:00:00Z', called_at: null },
    { id: 'e2', name: 'ليلى', source: 'remote', status: 'waiting', service_name: 'لحية', joined_at: '2026-10-01T10:05:00Z', called_at: null },
    { id: 'e3', name: 'أمين', source: 'barber', status: 'waiting', service_name: 'حلاقة', joined_at: '2026-10-01T10:06:00Z', called_at: null },
  ],
};

describe('BarberQueueCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockError = '';
    mockQueue = { ...openQueue };
    mockUpdate.mockResolvedValue(true);
    mockAddWalkin.mockResolvedValue(true);
    mockSetOpen.mockResolvedValue(true);
  });

  it('asks an unpublished barber to publish first and does not poll', async () => {
    await render(<BarberQueueCard active published={false} />);

    expect(screen.getByText('انشر ملفك أولا لتتمكن من فتح الطابور.')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('shows a closed queue with only the open switch', async () => {
    mockQueue = { ...openQueue, queue_open: false, entries: [] };
    await render(<BarberQueueCard active published />);

    expect(screen.getByText('الطابور مغلق')).toBeTruthy();
    expect(screen.queryByTestId('queue-add-walkin')).toBeNull();

    await fireEvent(screen.getByRole('switch', { name: 'الطابور' }), 'valueChange', true);
    expect(mockSetOpen).toHaveBeenCalledWith(true);
  });

  it('lists the line in order with the moves each person can make', async () => {
    await render(<BarberQueueCard active published />);

    expect(screen.getAllByTestId('queue-entry')).toHaveLength(3);
    expect(screen.getByText(/الموعد المحجوز القادم عند/)).toBeTruthy();
    // Serving: finish only. Remote waiting: call, start, remove. Walk-in: start, remove.
    expect(screen.getByRole('button', { name: 'انتهى، سمير' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'استدعاء، ليلى' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'استدعاء، أمين' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ابدأ، سمير' })).toBeNull();
  });

  it('moves people along', async () => {
    await render(<BarberQueueCard active published />);

    await fireEvent.press(screen.getByRole('button', { name: 'استدعاء، ليلى' }));
    expect(mockUpdate).toHaveBeenCalledWith('e2', 'call');

    await fireEvent.press(screen.getByRole('button', { name: 'انتهى، سمير' }));
    expect(mockUpdate).toHaveBeenCalledWith('e1', 'finish');
  });

  it('confirms before removing someone from the line', async () => {
    const alert = jest.spyOn(NativeAlert, 'alert').mockImplementation(() => undefined);
    await render(<BarberQueueCard active published />);

    await fireEvent.press(screen.getByRole('button', { name: 'إزالة، أمين' }));
    expect(mockUpdate).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] ?? [];
    buttons.find((button) => button.style === 'destructive')?.onPress?.();
    expect(mockUpdate).toHaveBeenCalledWith('e3', 'remove');
    alert.mockRestore();
  });

  it('adds a walk-in with a first name and a chosen service', async () => {
    await render(<BarberQueueCard active published />);

    await fireEvent.press(screen.getByTestId('queue-add-walkin'));
    const save = screen.getByRole('button', { name: 'إضافة إلى الطابور' });
    expect(save).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('الاسم الأول'), 'كريم');
    expect(save).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'لحية' }));
    expect(save).toBeEnabled();
    await fireEvent.press(save);

    await waitFor(() => expect(mockAddWalkin).toHaveBeenCalledWith('كريم', 's2'));
  });

  it('shows why an action failed', async () => {
    mockError = 'الطابور ممتلئ حاليا. حاول لاحقا.';
    await render(<BarberQueueCard active published />);

    expect(screen.getByRole('alert')).toHaveTextContent('الطابور ممتلئ حاليا. حاول لاحقا.');
  });
});
