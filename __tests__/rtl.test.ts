import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('RTL bootstrap', () => {
  it('does not mutate native RTL state during app startup', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'i18n', 'rtl.ts'), 'utf8');

    expect(source).not.toContain('I18nManager');
    expect(source).not.toContain('forceRTL(');
  });
});
