import { readFileSync } from 'fs';
import { join } from 'path';

describe('GetBankAccountTransactionsRepository Cash Vault visibility', () => {
  it('adds an explicit Cash Vault guard before loading banking transaction history', () => {
    const source = readFileSync(
      join(__dirname, 'GetBankAccountTransactionsRepo.service.ts'),
      'utf8',
    );

    expect(source).toContain('cashVaultAccess');
    expect(source).toContain('isCashVault');
  });
});
