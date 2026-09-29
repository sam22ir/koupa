import type { User } from '@supabase/supabase-js';
import { useCallback, useState } from 'react';
import { getPendingRole, hasSignupConsent } from '@/src/auth';
import * as legalService from '@/src/services/legal';
import type { LegalDocument } from '@/src/services/legal';
import { AppError } from '@/src/services/errors';
import {
  legalAcceptedCache,
  legalDocumentsCache,
  setLegalDocumentsCache,
} from '@/src/services/sessionCache';

export function useLegalAcceptance() {
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [legalConsentRequired, setLegalConsentRequired] = useState(false);
  const [legalDocuments, setLegalDocuments] = useState<readonly LegalDocument[]>([]);
  const [legalError, setLegalError] = useState<string | null>(null);

  const loadLegalDocuments = useCallback(async () => {
    if (legalDocumentsCache) {
      setLegalDocuments(legalDocumentsCache);
      return legalDocumentsCache;
    }
    const documents = await legalService.loadLegalDocuments();
    setLegalDocumentsCache(documents);
    setLegalDocuments(documents);
    return documents;
  }, []);

  const acceptLegalDocuments = useCallback(async (userId: string, documents?: readonly LegalDocument[]) => {
    const activeDocuments = documents ?? (await loadLegalDocuments());
    await legalService.acceptLegalDocuments(userId, activeDocuments);
    legalAcceptedCache.add(userId);
    setLegalAccepted(true);
    setLegalConsentRequired(false);
  }, [loadLegalDocuments]);

  const syncLegal = useCallback(async (
    user: User | null,
    options: { readonly canPersistSignupConsent?: boolean; readonly throwOnError?: boolean } = {},
  ) => {
    if (!user) {
      setLegalAccepted(false);
      setLegalConsentRequired(false);
      return null as ReturnType<typeof getPendingRole>;
    }
    const metadataRole = getPendingRole(user);
    try {
      const documents = await loadLegalDocuments();
      if (documents.length !== 2) {
        throw new Error('Active legal documents are not configured');
      }
      if (legalAcceptedCache.has(user.id)) {
        setLegalAccepted(true);
        setLegalConsentRequired(false);
        setLegalError(null);
        return metadataRole;
      }
      // Unconfirmed accounts are synced too. Returning early here left
      // legalAccepted false with no consent required, which the route gate
      // reads as a finish-account loop now that confirmation is not a wall.
      if (!hasSignupConsent(user) && options.canPersistSignupConsent) {
        throw new AppError('LEGAL_SAVE_FAILED', new Error('Signup consent is required'));
      }
      const accepted = await legalService.hasAcceptedLegalDocuments(user.id, documents);
      if (accepted) {
        legalAcceptedCache.add(user.id);
        setLegalAccepted(true);
        setLegalConsentRequired(false);
      } else if (options.canPersistSignupConsent && hasSignupConsent(user)) {
        await acceptLegalDocuments(user.id, documents);
      } else {
        setLegalAccepted(false);
        setLegalConsentRequired(true);
      }
      setLegalError(null);
    } catch (caught) {
      setLegalAccepted(false);
      setLegalConsentRequired(false);
      setLegalError('LEGAL_SAVE_FAILED');
      if (options.throwOnError) throw caught;
    }
    return metadataRole;
  }, [acceptLegalDocuments, loadLegalDocuments]);

  const acceptCurrentLegalDocuments = useCallback(async (userId: string) => {
    setLegalError(null);
    try {
      await acceptLegalDocuments(userId);
    } catch (caught) {
      setLegalAccepted(false);
      setLegalConsentRequired(false);
      setLegalError('LEGAL_SAVE_FAILED');
      throw caught;
    }
  }, [acceptLegalDocuments]);

  const resetLegal = useCallback(() => {
    setLegalAccepted(false);
    setLegalConsentRequired(false);
    setLegalError(null);
  }, []);

  return {
    legalAccepted,
    legalConsentRequired,
    legalDocuments,
    legalError,
    loadLegalDocuments,
    acceptLegalDocuments,
    acceptCurrentLegalDocuments,
    syncLegal,
    resetLegal,
  };
}
