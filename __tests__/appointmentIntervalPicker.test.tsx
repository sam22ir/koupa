import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppointmentIntervalPicker } from '@/src/features/barber-schedule/AppointmentIntervalPicker';

describe('AppointmentIntervalPicker', () => {
  it('exposes supported intervals as a reusable radio group', async () => {
    const onChange = jest.fn();
    await render(<AppointmentIntervalPicker value={15} onChange={onChange} />);

    expect(screen.getByRole('radio', { name: '15 دقيقة' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: '30 دقيقة' }));
    expect(onChange).toHaveBeenCalledWith(30);
  });
});
