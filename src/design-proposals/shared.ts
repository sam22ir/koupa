import { colors } from '../theme';

/** Shared brand map for design proposals (Teal Stage locked). */
export const brand = {
  primary: colors.primary,
  accent: colors.accent,
  text: colors.text,
  background: colors.background,
  surface: colors.surface,
  muted: colors.textMuted,
  border: colors.border,
  primarySoft: colors.primarySoft,
  accentSoft: colors.accentSoft,
  onPrimary: colors.onPrimary,
  onPrimaryMuted: colors.onPrimaryMuted,
  accentText: colors.accentText,
  stage: colors.stage,
  stageDecor: colors.stageDecor,
  stageOverlay: colors.stageOverlay,
  danger: colors.danger,
} as const;

export const sample = {
  customerName: 'أمينة',
  greeting: 'صباح الخير، أمينة',
  subtitle: 'موعدك القادم جاهز.',
  service: 'قصّة شعر',
  status: 'مؤكد',
  date: 'السبت 2 أغسطس',
  time: '14:30',
  duration: '45 دقيقة',
  price: '1,200 دج',
  barber: 'ياسين بن علي',
  barberInitials: 'ي ب',
  shop: 'Atelier 16، باب الزوار',
  city: 'الجزائر',
} as const;

export const nearbyBarbers = [
  {
    id: '1',
    initials: 'أ م',
    name: 'أمين مرزوق',
    rating: '4.8',
    price: 'من 1,100 دج',
    area: 'حيدرة',
  },
  {
    id: '2',
    initials: 'ن س',
    name: 'نسيم سعدي',
    rating: '4.7',
    price: 'من 800 دج',
    area: 'وسط الجزائر',
  },
] as const;

export type TabId = 'home' | 'find' | 'appointments' | 'profile';

export const tabs: { id: TabId; label: string }[] = [
  { id: 'profile', label: 'حسابي' },
  { id: 'appointments', label: 'مواعيدي' },
  { id: 'find', label: 'اكتشف' },
  { id: 'home', label: 'الرئيسية' },
];
