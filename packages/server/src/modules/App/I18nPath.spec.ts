import { normalize } from 'path';
import { resolveI18nPath } from './I18nPath';

describe('resolveI18nPath', () => {
  it('uses compiled dist assets when they exist', () => {
    const baseDir = '/repo/packages/server/dist/modules/App';
    const expected = normalize('/repo/packages/server/dist/i18n/');

    expect(resolveI18nPath(baseDir, (path) => normalize(path) === expected)).toBe(
      expected,
    );
  });

  it('falls back to source i18n assets when dist assets are temporarily missing', () => {
    const baseDir = '/repo/packages/server/dist/modules/App';

    expect(resolveI18nPath(baseDir, () => false)).toBe(
      normalize('/repo/packages/server/src/i18n/'),
    );
  });
});
