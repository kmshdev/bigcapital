import { existsSync } from 'fs';
import { join } from 'path';

export function resolveI18nPath(
  baseDir = __dirname,
  exists: (path: string) => boolean = existsSync,
) {
  const compiledPath = join(baseDir, '../../i18n/');
  if (exists(compiledPath)) {
    return compiledPath;
  }
  return join(baseDir, '../../../src/i18n/');
}
