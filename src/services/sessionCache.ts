import type { Session } from '@supabase/supabase-js';
import type { LegalDocument } from '@/src/services/legal';
import type { Profile } from '@/src/services/profile';

export let sessionCache: Session | null | undefined;
export const profileCache = new Map<string, Profile | null>();
export let legalDocumentsCache: readonly LegalDocument[] | undefined;
export const legalAcceptedCache = new Set<string>();

export function setSessionCache(session: Session | null | undefined) {
  sessionCache = session;
}

export function setLegalDocumentsCache(documents: readonly LegalDocument[] | undefined) {
  legalDocumentsCache = documents;
}

export function clearSessionCaches() {
  sessionCache = null;
  profileCache.clear();
  legalDocumentsCache = undefined;
  legalAcceptedCache.clear();
}

export function clearUserScopedCaches() {
  profileCache.clear();
  legalAcceptedCache.clear();
}
