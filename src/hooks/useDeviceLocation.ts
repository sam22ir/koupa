import { useCallback, useState } from 'react';

import type { GeoPoint } from '@/src/location';
import { requestDeviceCoordinates, type DeviceLocationStatus } from '@/src/services/deviceLocation';
import { errorCode } from '@/src/services/errors';

export function useDeviceLocation() {
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<DeviceLocationStatus>('idle');
  const [error, setError] = useState<unknown>(null);

  const request = useCallback(async (): Promise<GeoPoint | null> => {
    setStatus('requesting');
    setError(null);
    try {
      const next = await requestDeviceCoordinates();
      setCoords(next);
      setStatus('granted');
      return next;
    } catch (caught) {
      const code = errorCode(caught);
      setCoords(null);
      setStatus(code === 'LOCATION_REQUIRED' ? 'denied' : 'unavailable');
      setError(caught);
      return null;
    }
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus('idle');
    setError(null);
  }, []);

  return { coords, status, error, request, clear };
}
