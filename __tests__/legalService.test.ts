const mockEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ eq: mockEq })),
    })),
  },
}));

import { loadLegalDocuments } from '@/src/services/legal';

describe('legal document URLs', () => {
  it('uses canonical Koupa website links even when stored rows contain placeholders', async () => {
    mockEq.mockResolvedValue({
      data: [
        { key: 'terms', version: '2026-07-29', url: 'https://example.com/terms' },
        { key: 'privacy', version: '2026-07-29', url: 'https://example.com/privacy' },
      ],
      error: null,
    });

    await expect(loadLegalDocuments()).resolves.toEqual([
      {
        key: 'terms',
        version: '2026-07-29',
        url: 'https://koupa-website.pages.dev/terms/',
      },
      {
        key: 'privacy',
        version: '2026-07-29',
        url: 'https://koupa-website.pages.dev/privacy/',
      },
    ]);
  });
});
