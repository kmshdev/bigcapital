// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('DashboardTopbar Cash Vault gates', () => {
  it('opens a Cash Vault challenge from Help and double-click notification paths', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'DashboardTopbar.tsx'),
      'utf8',
    );

    expect(source).toContain('DialogsName.CashVaultChallenge');
    expect(source).toContain("purpose: 'entry'");
    expect(source).toContain("purpose: 'manage'");
    expect(source).toContain('onDoubleClick');
    expect(source).not.toContain('openDialog(DialogsName.CashVaultEntry)');
  });
});
