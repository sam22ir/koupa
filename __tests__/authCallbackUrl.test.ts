jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'https://localhost:8081/callback'),
}));
jest.mock('expo-constants', () => ({
  appOwnership: 'standalone',
  executionEnvironment: 'standalone',
}));
jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://127.0.0.1:8081/--/callback'),
}));
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return process.env.TEST_PLATFORM_OS || 'android';
    },
  },
}));

import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

import { authCallbackUrl, NATIVE_AUTH_CALLBACK_URL } from '@/src/services/authCallbackUrl';

describe('authCallbackUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TEST_PLATFORM_OS;
    delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
    (Constants as { appOwnership: string | null }).appOwnership = 'standalone';
    (Constants as { executionEnvironment: string }).executionEnvironment = 'standalone';
    (Linking.createURL as jest.Mock).mockReturnValue('exp://127.0.0.1:8081/--/callback');
  });

  it('uses the configured public callback URL for production web auth', () => {
    process.env.TEST_PLATFORM_OS = 'web';
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL = 'https://app.example.com/callback';

    expect(authCallbackUrl()).toBe('https://app.example.com/callback');
  });

  it('returns the exact koupa callback on installed Android builds', () => {
    process.env.TEST_PLATFORM_OS = 'android';
    (Constants as { appOwnership: string | null }).appOwnership = null;
    (Constants as { executionEnvironment: string }).executionEnvironment = 'bare';

    expect(authCallbackUrl()).toBe('koupa://callback');
    expect(authCallbackUrl()).toBe(NATIVE_AUTH_CALLBACK_URL);
    expect(authCallbackUrl()).not.toContain('///');
    expect(authCallbackUrl()).not.toContain('expo-development-client');
    expect(Linking.createURL).not.toHaveBeenCalled();
  });

  it('uses the Expo Router /--/callback URL inside Expo Go', () => {
    process.env.TEST_PLATFORM_OS = 'android';
    (Constants as { appOwnership: string }).appOwnership = 'expo';
    (Constants as { executionEnvironment: string }).executionEnvironment = 'storeClient';
    (Linking.createURL as jest.Mock).mockReturnValue('exp://192.168.1.20:8081/--/callback');

    expect(authCallbackUrl()).toBe('exp://192.168.1.20:8081/--/callback');
    expect(Linking.createURL).toHaveBeenCalledWith('/callback');
  });
});
