import { Linking, Platform } from 'react-native';
import {
  buildGoogleMapsUri,
  buildHeetchUri,
  buildYassirUri,
  getProviderPlan,
  launchNavigationProvider,
  resolveAppointmentCoordinates,
} from '@/src/services/navigationLauncher';

describe('navigationLauncher service', () => {
  const algerCoords = { latitude: 36.7538, longitude: 3.0588 };
  const sampleMapsUrl = 'https://www.google.com/maps/search/?api=1&query=36.7538,3.0588';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveAppointmentCoordinates', () => {
    it('resolves coordinates from query maps url', () => {
      const coords = resolveAppointmentCoordinates(sampleMapsUrl);
      expect(coords).toEqual(algerCoords);
    });

    it('returns null for empty or invalid url', () => {
      expect(resolveAppointmentCoordinates(null)).toBeNull();
      expect(resolveAppointmentCoordinates('')).toBeNull();
      expect(resolveAppointmentCoordinates('not-a-url')).toBeNull();
    });
  });

  describe('URI builders', () => {
    it('builds Google Maps intent and fallback URLs', () => {
      const { primaryUri, fallbackUri } = buildGoogleMapsUri(algerCoords);
      expect(fallbackUri).toBe('https://www.google.com/maps/dir/?api=1&destination=36.7538,3.0588');
      if (Platform.OS === 'android') {
        expect(primaryUri).toBe('google.navigation:q=36.7538,3.0588&mode=d');
      } else {
        expect(primaryUri).toBe('https://www.google.com/maps/dir/?api=1&destination=36.7538,3.0588');
      }
    });

    it('builds Yassir deep link with optional destination name', () => {
      const { primaryUri, fallbackUri } = buildYassirUri(algerCoords, 'صالون النور');
      expect(primaryUri).toContain('yassir://ride?lat=36.7538&lng=3.0588&dropoff_name=');
      expect(fallbackUri).toContain('com.yassir.client');
    });

    it('builds Heetch deep link with optional destination name', () => {
      const { primaryUri, fallbackUri } = buildHeetchUri(algerCoords, 'صالون النور');
      expect(primaryUri).toContain('heetch://ride?dropoff_lat=36.7538&dropoff_lng=3.0588&dropoff_name=');
      expect(fallbackUri).toContain('com.heetch');
    });
  });

  describe('getProviderPlan', () => {
    it('returns Google Maps plan with raw url when no coordinates are extractable', () => {
      const rawUrl = 'https://maps.app.goo.gl/some-short-link';
      const plan = getProviderPlan('google_maps', { mapsUrl: rawUrl });
      expect(plan).toEqual({
        provider: 'google_maps',
        primaryUri: rawUrl,
        fallbackUri: rawUrl,
      });
    });

    it('returns null for Yassir when no coordinates exist', () => {
      const rawUrl = 'https://maps.app.goo.gl/some-short-link';
      const plan = getProviderPlan('yassir', { mapsUrl: rawUrl });
      expect(plan).toBeNull();
    });

    it('returns valid plans for Yassir and Heetch when coordinates exist', () => {
      const planYassir = getProviderPlan('yassir', { coordinates: algerCoords, destinationName: 'Koupa' });
      expect(planYassir).not.toBeNull();
      expect(planYassir?.provider).toBe('yassir');

      const planHeetch = getProviderPlan('heetch', { mapsUrl: sampleMapsUrl });
      expect(planHeetch).not.toBeNull();
      expect(planHeetch?.provider).toBe('heetch');
    });
  });

  describe('launchNavigationProvider', () => {
    it('opens primary URI when canOpenURL is true', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const success = await launchNavigationProvider('yassir', { coordinates: algerCoords });
      expect(success).toBe(true);
      expect(Linking.canOpenURL).toHaveBeenCalledWith(expect.stringContaining('yassir://'));
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('yassir://'));
    });

    it('falls back to store URI when canOpenURL is false', async () => {
      (Linking.canOpenURL as jest.Mock).mockResolvedValue(false);
      (Linking.openURL as jest.Mock).mockResolvedValue(true);

      const success = await launchNavigationProvider('yassir', { coordinates: algerCoords });
      expect(success).toBe(true);
      expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('com.yassir.client'));
    });
  });
});
