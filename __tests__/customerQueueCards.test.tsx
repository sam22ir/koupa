import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert as NativeAlert } from 'react-native';

import { JoinQueueCard } from '@/src/features/customer-queue/JoinQueueCard';
import { MyQueueCard } from '@/src/features/customer-queue/MyQueueCard';
import type { MyQueueEntry } from '@/src/queue';

// Same formatter the screens use, so the test is independent of the ICU digit set.
const n = (value: number) => value.toLocaleString('ar-DZ');

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), dismissTo: jest.fn() } }));

const waiting: MyQueueEntry = {
  id: 'e1', barber_id: 'b1', barber_name: 'أمين', service_name: 'حلاقة',
  status: 'waiting', position: 3, waiting_count: 5, called_at: null,
};

describe('MyQueueCard', () => {
  it('shows the position and how many are ahead while waiting', async () => {
    await render(<MyQueueCard entry={waiting} leaving={false} error="" onLeave={jest.fn()} />);

    expect(screen.getByLabelText(/دورك/)).toHaveTextContent(n(3));
    expect(screen.getByText(`أمامك: ${n(2)}`)).toBeTruthy();
    expect(screen.getByText(/عند أمين · حلاقة/)).toBeTruthy();
    // Position only: no time estimate is shown.
    expect(screen.queryByText(/دقيقة/)).toBeNull();
  });

  it('calls the customer with a countdown', async () => {
    const calledAt = new Date(Date.now() - 2 * 60000).toISOString();
    await render(
      <MyQueueCard entry={{ ...waiting, status: 'called', position: null, called_at: calledAt }} leaving={false} error="" onLeave={jest.fn()} />,
    );

    expect(screen.getByText('حان دورك')).toBeTruthy();
    expect(screen.getByText(new RegExp(`${n(8)} دقيقة`))).toBeTruthy();
  });

  it('has no leave button once the customer is in the chair', async () => {
    await render(<MyQueueCard entry={{ ...waiting, status: 'serving', position: null }} leaving={false} error="" onLeave={jest.fn()} />);

    expect(screen.getByText('أنت على الكرسي الآن')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'مغادرة الطابور' })).toBeNull();
  });

  it('confirms before leaving', async () => {
    const alert = jest.spyOn(NativeAlert, 'alert').mockImplementation(() => undefined);
    const onLeave = jest.fn();
    await render(<MyQueueCard entry={waiting} leaving={false} error="" onLeave={onLeave} />);

    await fireEvent.press(screen.getByRole('button', { name: 'مغادرة الطابور' }));
    expect(onLeave).not.toHaveBeenCalled();
    alert.mock.calls[0][2]?.find((button) => button.style === 'destructive')?.onPress?.();
    expect(onLeave).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });
});

describe('JoinQueueCard', () => {
  const base = { canJoin: true, guest: false, serviceChosen: true, joining: false, error: '', onJoin: jest.fn() };

  it('renders nothing while the queue is closed', async () => {
    await render(<JoinQueueCard {...base} status={{ queue_open: false, waiting_count: 0 }} />);
    expect(screen.queryByTestId('join-queue-card')).toBeNull();
  });

  it('shows the waiting count and joins when a service is chosen', async () => {
    const onJoin = jest.fn();
    await render(<JoinQueueCard {...base} onJoin={onJoin} status={{ queue_open: true, waiting_count: 4 }} />);

    expect(screen.getByText(`${n(4)} في الانتظار الآن`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'انضم إلى الطابور' }));
    expect(onJoin).toHaveBeenCalledTimes(1);
  });

  it('asks for a service first', async () => {
    await render(<JoinQueueCard {...base} serviceChosen={false} status={{ queue_open: true, waiting_count: 1 }} />);

    expect(screen.getByText('اختر الخدمة ثم انضم إلى الطابور بدون موعد.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'انضم إلى الطابور' })).toBeDisabled();
  });

  it('shows why joining failed', async () => {
    await render(<JoinQueueCard {...base} error="الطابور ممتلئ حاليا. حاول لاحقا." status={{ queue_open: true, waiting_count: 20 }} />);
    expect(screen.getByRole('alert')).toHaveTextContent('الطابور ممتلئ حاليا. حاول لاحقا.');
  });
});
