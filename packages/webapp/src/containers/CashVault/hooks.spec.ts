import fs from 'fs';
import path from 'path';

describe('CashVault hooks', () => {
  const source = fs.readFileSync(path.join(__dirname, 'hooks.ts'), 'utf8');

  it('requests the current vault account with entry scope', () => {
    const accountsHook = source.slice(
      source.indexOf('export function useCashVaultAccounts'),
      source.indexOf('export function useDesignateCashVaultAccount'),
    );

    expect(accountsHook).toContain("get('/cash-vault/accounts'");
    expect(accountsHook).toContain('cashVaultEntryScope');
    expect(accountsHook).not.toContain('cashVaultManageScope');
  });
});
