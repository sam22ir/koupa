import { mapCustomerAppointment } from '@/src/services/mappers/appointment';

describe('customer appointment mapper', () => {
  it('keeps the related shop name for home appointment context', () => {
    expect(mapCustomerAppointment({
      id: 'appointment-1',
      barber_id: 'barber-1',
      service_id: 'service-1',
      starts_at: '2026-08-20T11:30:00.000Z',
      ends_at: '2026-08-20T12:00:00.000Z',
      price_dzd: 900,
      status: 'booked',
      services: { name: 'حلاقة ولحية' },
      profiles: { name: 'أمين', maps_url: null },
      shops: { name: 'صالون النور', maps_url: null },
    })).toMatchObject({
      service_name: 'حلاقة ولحية',
      barber_name: 'أمين',
      shop_name: 'صالون النور',
    });
  });
});
