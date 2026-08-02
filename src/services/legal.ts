import { supabase } from '@/lib/supabase';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { toAppError } from '@/src/services/errors';

export interface LegalDocument {
  readonly key: 'terms' | 'privacy';
  readonly version: string;
  readonly url: string;
}

export async function loadLegalDocuments(): Promise<readonly LegalDocument[]> {
  const { data, error } = await supabase.from('legal_documents').select('key,version,url').eq('is_active', true);
  if (error) throw toAppError(error);
  return ((data ?? []) as LegalDocument[]).map((document) => ({
    ...document,
    url: document.key === 'terms' ? TERMS_URL : PRIVACY_URL,
  }));
}

export async function hasAcceptedLegalDocuments(userId: string, documents: readonly LegalDocument[]): Promise<boolean> {
  if (documents.length !== 2) return false;
  const { data, error } = await supabase
    .from('legal_acceptances')
    .select('document_key,document_version')
    .eq('user_id', userId);
  if (error) throw toAppError(error);
  return documents.every((document) =>
    data?.some((item) => item.document_key === document.key && item.document_version === document.version),
  );
}

export async function acceptLegalDocuments(userId: string, documents?: readonly LegalDocument[]): Promise<void> {
  const activeDocuments = documents ?? (await loadLegalDocuments());
  if (activeDocuments.length !== 2) throw toAppError(new Error('Legal documents are not configured'));

  const { data: existing, error: existingError } = await supabase
    .from('legal_acceptances')
    .select('document_key,document_version')
    .eq('user_id', userId);
  if (existingError) throw toAppError(existingError);

  const rows = activeDocuments
    .filter((document) => !existing?.some((item) => item.document_key === document.key && item.document_version === document.version))
    .map((document) => ({
      user_id: userId,
      document_key: document.key,
      document_version: document.version,
    }));

  if (!rows.length) return;
  const { error } = await supabase.from('legal_acceptances').insert(rows);
  if (error) throw toAppError(error);
}
