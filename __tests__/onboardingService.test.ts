import { defaultBarberDraft } from '@/src/data/onboarding';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { publishBarberProfile } from '@/src/services/onboarding';

describe('barber onboarding service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
  });

  it('publishes the owned shop fields with the barber profile', async () => {
    await publishBarberProfile({
      ...defaultBarberDraft,
      name: 'أمين',
      phone: '0555000000',
      shopName: 'محل النور',
      shopBio: 'حلاقة رجالية',
      city: 'الجزائر',
      neighborhood: 'باب الوادي',
      mapsUrl: 'https://maps.app.goo.gl/example',
      services: [{ name: 'حلاقة', priceDzd: '800', durationMinutes: '30' }],
    });

    expect(mockRpc).toHaveBeenCalledWith('publish_barber_profile', {
      payload: expect.objectContaining({
        workplace_type: 'owner',
        shop_name: 'محل النور',
        shop_bio: 'حلاقة رجالية',
      }),
    });
  });

  it('never sends owned-shop fields for worker onboarding', async () => {
    await publishBarberProfile({
      ...defaultBarberDraft,
      name: 'أمين',
      phone: '0555000000',
      workplaceType: 'worker',
      shopName: 'بيانات قديمة',
      shopBio: 'يجب تجاهلها',
      city: '',
      neighborhood: '',
      mapsUrl: '',
      latitude: '',
      longitude: '',
      services: [{ name: 'حلاقة', priceDzd: '800', durationMinutes: '30' }],
    });

    expect(mockRpc).toHaveBeenCalledWith('publish_barber_profile', {
      payload: expect.objectContaining({
        workplace_type: 'worker',
        shop_name: null,
        shop_bio: null,
      }),
    });
  });
});
