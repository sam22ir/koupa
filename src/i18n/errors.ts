import { isGoogleCollisionMessage } from '@/src/auth';
import { mapRpcMessage, type AppErrorCode } from '@/src/services/errors';

import { t } from './index';

const codes: readonly AppErrorCode[] = [
  'SLOT_UNAVAILABLE',
  'ACTIVE_APPOINTMENT',
  'CANCEL_NOT_ALLOWED',
  'RESCHEDULE_NOT_ALLOWED',
  'CHECKIN_NOT_ALLOWED',
  'RATING_NOT_ALLOWED',
  'RATING_EDIT_WINDOW',
  'VALIDATION',
  'LOCATION_REQUIRED',
  'INVALID_TIME',
  'LEGAL_SAVE_FAILED',
  'EMAIL_RATE_LIMIT',
  'EMAIL_NOT_CONFIRMED',
  'PHONE_ALREADY_IN_USE',
  'INVITATION_NOT_ALLOWED',
  'UNAUTHORIZED',
  'NETWORK',
  'UNKNOWN',
  'FAILED',
] as const;

const legacyCodeMap: Readonly<Record<string, AppErrorCode>> = {
  failed: 'FAILED',
  invalidTime: 'INVALID_TIME',
  locationRequired: 'LOCATION_REQUIRED',
  network: 'NETWORK',
  unauthorized: 'UNAUTHORIZED',
  unknown: 'UNKNOWN',
  validation: 'VALIDATION',
  invitationNotAllowed: 'INVITATION_NOT_ALLOWED',
};

function rawMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) {
    if ('cause' in error && error.cause instanceof Error) {
      return `${error.message} ${error.cause.message}`;
    }
    return error.message;
  }
  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message ?? '');
  }
  return '';
}

/** Auth-specific Arabic copy (no recursion into formatAppError). */
export function formatAuthError(error: unknown): string {
  const message = rawMessage(error);
  if (isGoogleCollisionMessage(message)) return t('auth.collisionBody');
  if (/user already registered|already been registered/i.test(message)) return t('auth.accountExists');
  if (/invalid login credentials/i.test(message)) return t('auth.invalidCredentials');
  if (/email not confirmed/i.test(message)) return t('auth.emailNotConfirmed');
  if (/otp_expired|link.*expir|expired/i.test(message)) return t('auth.linkExpiredBody');
  if (/network|failed to fetch/i.test(message)) return t('errors.NETWORK');
  if (/[\u0600-\u06FF]/.test(message)) return message;
  return t('errors.UNAUTHORIZED');
}

export function formatAppError(error: unknown): string {
  const message = rawMessage(error);

  if (isGoogleCollisionMessage(message)) return t('auth.collisionBody');
  if (/invalid login credentials/i.test(message)) return t('auth.invalidCredentials');
  if (/email not confirmed/i.test(message)) return t('auth.emailNotConfirmed');
  if (/otp_expired|link.*expir|expired/i.test(message)) return t('auth.linkExpiredBody');

  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    if ((codes as readonly string[]).includes(code)) {
      if (code === 'UNAUTHORIZED') return formatAuthError(error);
      return t(`errors.${code}`);
    }
  }

  if (typeof error === 'string') {
    if ((codes as readonly string[]).includes(error)) return t(`errors.${error}`);
    const legacyCode = legacyCodeMap[error];
    if (legacyCode) return t(`errors.${legacyCode}`);
    if (/[\u0600-\u06FF]/.test(error)) return error;
  }

  if (error instanceof Error && error.message) {
    if (/[\u0600-\u06FF]/.test(error.message)) return error.message;
    if ((codes as readonly string[]).includes(error.message)) {
      return t(`errors.${error.message}`);
    }
    const legacyCode = legacyCodeMap[error.message];
    if (legacyCode) return t(`errors.${legacyCode}`);
    const mappedCode = mapRpcMessage(error);
    if (mappedCode === 'UNAUTHORIZED') return formatAuthError(error);
    if (mappedCode !== 'UNKNOWN') return t(`errors.${mappedCode}`);
  }

  return t('errors.UNKNOWN');
}
