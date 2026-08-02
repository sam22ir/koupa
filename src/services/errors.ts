export type AppErrorCode =
  | 'SLOT_UNAVAILABLE'
  | 'ACTIVE_APPOINTMENT'
  | 'CANCEL_NOT_ALLOWED'
  | 'RESCHEDULE_NOT_ALLOWED'
  | 'CHECKIN_NOT_ALLOWED'
  | 'RATING_NOT_ALLOWED'
  | 'RATING_EDIT_WINDOW'
  | 'VALIDATION'
  | 'LOCATION_REQUIRED'
  | 'INVALID_TIME'
  | 'LEGAL_SAVE_FAILED'
  | 'RECOVERY_EMAIL_ATTACH_FAILED'
  | 'INVITATION_NOT_ALLOWED'
  | 'UNAUTHORIZED'
  | 'NETWORK'
  | 'UNKNOWN'
  | 'FAILED';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly cause?: unknown;

  constructor(code: AppErrorCode, cause?: unknown) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

function messageOf(error: unknown): string {
  if (error instanceof AppError) return error.code;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message ?? '');
  }
  return '';
}

export function mapRpcMessage(error: unknown): AppErrorCode {
  const message = messageOf(error);
  if (!message) return 'UNKNOWN';
  if (message.includes('unavailable')) return 'SLOT_UNAVAILABLE';
  if (message.includes('active appointment')) return 'ACTIVE_APPOINTMENT';
  if (message.includes('cannot be cancelled')) return 'CANCEL_NOT_ALLOWED';
  if (message.includes('cannot be rescheduled')) return 'RESCHEDULE_NOT_ALLOWED';
  if (message.includes('cannot be checked in')) return 'CHECKIN_NOT_ALLOWED';
  if (message.includes('cannot be edited')) return 'RATING_EDIT_WINDOW';
  if (message.includes('cannot be submitted') || message.includes('Rating')) return 'RATING_NOT_ALLOWED';
  if (message.includes('location is required') || message.includes('locationRequired')) return 'LOCATION_REQUIRED';
  if (message.includes('Invitation cannot be sent')) return 'INVITATION_NOT_ALLOWED';
  if (message.includes('Invalid login credentials') || message.includes('Email not confirmed')) return 'UNAUTHORIZED';
  if (message.includes('Invalid schedule') || message.includes('invalidTime') || message.includes('working day')) {
    return 'INVALID_TIME';
  }
  if (
    message.includes('Invalid')
    || message.includes('validation')
    || message.includes('required')
    || message.includes('At least one')
  ) {
    return 'VALIDATION';
  }
  if (message.includes('Authentication is required') || message.includes('JWT')) return 'UNAUTHORIZED';
  if (message.includes('Failed to fetch') || message.includes('Network')) return 'NETWORK';
  return 'FAILED';
}

export function toAppError(error: unknown, fallback: AppErrorCode = 'FAILED'): AppError {
  if (error instanceof AppError) return error;
  return new AppError(mapRpcMessage(error) === 'UNKNOWN' ? fallback : mapRpcMessage(error), error);
}

export function errorCode(error: unknown): AppErrorCode {
  return toAppError(error).code;
}

/** Arabic fallback strings for hooks that still surface user-visible copy. Prefer UI i18n. */
export function bookingErrorMessage(error: unknown): string {
  switch (errorCode(error)) {
    case 'SLOT_UNAVAILABLE':
      return 'هذا الوقت لم يعد متاحاً. اختر وقتاً آخر.';
    case 'ACTIVE_APPOINTMENT':
      return 'لديك موعد نشط بالفعل.';
    case 'CANCEL_NOT_ALLOWED':
      return 'لا يمكن إلغاء الموعد في هذا الوقت.';
    case 'RESCHEDULE_NOT_ALLOWED':
      return 'لا يمكن تعديل هذا الموعد.';
    case 'CHECKIN_NOT_ALLOWED':
      return 'لم نتمكن من تأكيد حضورك. تأكد من أن لديك موعدا محجوزا مع هذا الحلاق وأن وقت الحضور بدأ، ثم حاول مسح الرمز مرة أخرى.';
    case 'RATING_EDIT_WINDOW':
      return 'انتهت مهلة تعديل التقييم (24 ساعة).';
    case 'RATING_NOT_ALLOWED':
      return 'لا يمكن إرسال هذا التقييم الآن.';
    case 'VALIDATION':
      return 'تحقق من البيانات المدخلة.';
    case 'INVALID_TIME':
      return 'الوقت المدخل غير صالح.';
    case 'LOCATION_REQUIRED':
      return 'الموقع مطلوب.';
    case 'UNAUTHORIZED':
      return 'يلزم تسجيل الدخول.';
    case 'NETWORK':
      return 'تحقق من الاتصال بالإنترنت.';
    default:
      return 'تعذّر تنفيذ طلب الحجز. تحقق من الاتصال وحاول مرة أخرى.';
  }
}
