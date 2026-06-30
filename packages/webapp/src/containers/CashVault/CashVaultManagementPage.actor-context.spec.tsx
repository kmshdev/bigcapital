import fs from 'fs';
import path from 'path';

describe('CashVaultManagementPage actor context', () => {
  it('does not collect or submit sensitive action user IDs from the browser', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'CashVaultManagementPage.tsx'),
      'utf8',
    );

    expect(source).not.toContain('unlockGrantedByUserId');
    expect(source).not.toContain('revokeByUserId');
    expect(source).not.toContain('designatedByUserId');
    expect(source).not.toContain('grantedByUserId');
    expect(source).not.toContain('revokedByUserId');
    expect(source).not.toContain('cash_vault.action_user_id');
    expect(source).not.toContain('cash_vault.designated_admins');
    expect(source).not.toContain('cash_vault.temporary_unlock');
    expect(source).not.toContain('Hidden Cash Vault');
    expect(source).not.toContain('<T id="cash_vault.management.title" />');
    expect(source).toContain('cash_vault.add_expense');
    expect(source).toContain('cash_vault.expenses');
    expect(source).toContain('useCurrentOrganizationName');
    expect(source).toContain('TEST_LEDGER_');
  });
});
