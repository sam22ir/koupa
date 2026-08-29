import { fireEvent, render } from '@testing-library/react-native';
import { DirectionsModal } from '@/src/components/navigation/DirectionsModal';
import * as navigationLauncher from '@/src/services/navigationLauncher';

jest.mock('@/src/services/navigationLauncher', () => {
  const actual = jest.requireActual('@/src/services/navigationLauncher');
  return {
    ...actual,
    launchNavigationProvider: jest.fn().mockResolvedValue(true),
  };
});

describe('DirectionsModal component', () => {
  const mockClose = jest.fn();
  const sampleMapsUrl = 'https://www.google.com/maps/search/?api=1&query=36.7538,3.0588';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with options when coordinates are present', async () => {
    const view = await render(
      <DirectionsModal
        visible={true}
        onClose={mockClose}
        mapsUrl={sampleMapsUrl}
        destinationName="صالون النور"
      />
    );

    expect(view.getByText('التوجه إلى الصالون')).toBeTruthy();
    expect(view.getByText('خرائط Google')).toBeTruthy();
    expect(view.getByText('تطبيق يسير (Yassir)')).toBeTruthy();
    expect(view.getByText('تطبيق هيتش (Heetch)')).toBeTruthy();
  });

  it('launches selected provider and closes modal on tap', async () => {
    const view = await render(
      <DirectionsModal
        visible={true}
        onClose={mockClose}
        mapsUrl={sampleMapsUrl}
        destinationName="صالون النور"
      />
    );

    const yassirBtn = view.getByText('تطبيق يسير (Yassir)');
    fireEvent.press(yassirBtn);

    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(navigationLauncher.launchNavigationProvider).toHaveBeenCalledWith(
      'yassir',
      expect.objectContaining({
        destinationName: 'صالون النور',
        mapsUrl: sampleMapsUrl,
      })
    );
  });

  it('disables Yassir and Heetch when coordinates cannot be resolved from raw url', async () => {
    const view = await render(
      <DirectionsModal
        visible={true}
        onClose={mockClose}
        mapsUrl="https://maps.app.goo.gl/some-short-link"
      />
    );

    expect(view.getByText('فتح رابط الخريطة')).toBeTruthy();
    const yassirOption = view.getByRole('button', { name: /تطبيق يسير/ });
    expect(yassirOption).toBeDisabled();
    const heetchOption = view.getByRole('button', { name: /تطبيق هيتش/ });
    expect(heetchOption).toBeDisabled();
  });
});
