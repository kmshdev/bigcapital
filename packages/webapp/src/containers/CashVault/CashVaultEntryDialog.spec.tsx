// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('CashVaultEntryDialog', () => {
  it('does not render hidden Cash Vault account identity or balance fields', () => {
    const dialogSource = fs.readFileSync(
      path.join(__dirname, 'CashVaultEntryDialog.tsx'),
      'utf8',
    );
    const hookSource = fs.readFileSync(path.join(__dirname, 'hooks.ts'), 'utf8');

    expect(hookSource).toContain("post('/cash-vault/entries'");
    expect(dialogSource).not.toContain('cashflowAccountId');
    expect(dialogSource).not.toContain('cashVaultAccountId');
    expect(dialogSource).not.toContain('balance');
  });

  it('uses a ledger account selector instead of a raw numeric offset id', () => {
    const dialogSource = fs.readFileSync(
      path.join(__dirname, 'CashVaultEntryDialog.tsx'),
      'utf8',
    );

    expect(dialogSource).toContain('useAccounts');
    expect(dialogSource).toContain('AccountsSuggestField');
    expect(dialogSource).not.toContain("label={<T id={'cash_vault.offset_account_id'} />}");
    expect(dialogSource).not.toContain("setValue('offsetAccountId', offsetAccountId)");
  });
});
