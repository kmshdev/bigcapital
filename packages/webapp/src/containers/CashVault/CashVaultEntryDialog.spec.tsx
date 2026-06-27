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
});
