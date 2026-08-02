import { AppError, bookingErrorMessage, errorCode, mapRpcMessage } from '@/src/services/errors';
import { formatAppError } from '@/src/i18n/errors';

describe('service error mapping', () => {
  it('maps known booking RPC messages', () => {
    expect(mapRpcMessage(new Error('Slot is unavailable'))).toBe('SLOT_UNAVAILABLE');
    expect(mapRpcMessage(new Error('Customer already has an active appointment'))).toBe('ACTIVE_APPOINTMENT');
    expect(mapRpcMessage(new Error('Appointment cannot be cancelled'))).toBe('CANCEL_NOT_ALLOWED');
    expect(mapRpcMessage(new Error('Appointment cannot be rescheduled'))).toBe('RESCHEDULE_NOT_ALLOWED');
    expect(mapRpcMessage(new Error('Appointment cannot be checked in'))).toBe('CHECKIN_NOT_ALLOWED');
    expect(mapRpcMessage(new Error('Rating cannot be edited'))).toBe('RATING_EDIT_WINDOW');
    expect(mapRpcMessage(new Error('Invalid login credentials'))).toBe('UNAUTHORIZED');
  });

  it('preserves AppError codes', () => {
    expect(errorCode(new AppError('LOCATION_REQUIRED'))).toBe('LOCATION_REQUIRED');
  });

  it('returns Arabic booking fallbacks for UI hooks', () => {
    expect(bookingErrorMessage(new Error('unavailable'))).toContain('متاح');
    expect(bookingErrorMessage(new Error('something else'))).toContain('تعذّر');
  });

  it('preserves Arabic hook errors in the error banner', () => {
    expect(formatAppError('لا يمكن تسجيل الحضور الآن')).toBe('لا يمكن تسجيل الحضور الآن');
  });

  it('formats legacy hook error keys', () => {
    expect(formatAppError('failed')).toBe('تعذّر تنفيذ هذه العملية. تحقق من البيانات أو الاتصال ثم حاول مرة أخرى.');
    expect(formatAppError('invalidTime')).toBe('وقت غير صالح');
    expect(formatAppError('validation')).toBe('تحقق من البيانات المدخلة');
  });

  it('maps raw backend errors to specific messages', () => {
    expect(formatAppError(new Error('Invalid login credentials'))).toBe('بيانات الدخول غير صحيحة');
    expect(formatAppError(new Error('Appointment cannot be checked in'))).toBe('لم نتمكن من تأكيد حضورك. تأكد من أن لديك موعدا محجوزا مع هذا الحلاق وأن وقت الحضور بدأ، ثم حاول مرة أخرى.');
  });
});
