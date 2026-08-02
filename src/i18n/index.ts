import { ar, type Dictionary } from './ar';
import { bootstrapRtl } from './rtl';

type NestedKeyOf<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? NestedKeyOf<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

export type TranslationKey = NestedKeyOf<Dictionary>;

const dictionaries = { ar } as const;
export type Locale = keyof typeof dictionaries;

let locale: Locale = 'ar';

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  locale = next;
}

/** Dot-path lookup, e.g. t('home.manage') */
export function t(key: TranslationKey | string): string {
  const parts = key.split('.');
  let node: unknown = dictionaries[locale];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof node === 'string' ? node : key;
}

/** @deprecated use bootstrapRtl — kept for call-site compatibility */
export function ensureRtl(): void {
  bootstrapRtl();
}

export { ar, bootstrapRtl };
