import fs from 'fs';
import path from 'path';

describe('CashVaultChallengeDialog wording', () => {
  it('uses neutral timeout copy instead of Cash Vault labels', () => {
    const dialogSource = fs.readFileSync(
      path.join(__dirname, 'CashVaultChallengeDialog.tsx'),
      'utf8',
    );
    const langSource = fs.readFileSync(
      path.join(__dirname, '../../lang/en/index.json'),
      'utf8',
    );

    expect(langSource).toContain(
      '"cash_vault.challenge.title": "Login timed out, Please reenter password"',
    );
    expect(langSource).toContain('"cash_vault.challenge_password": "Password"');
    expect(langSource).not.toContain('"Cash Vault access"');
    expect(langSource).not.toContain('"Cash Vault password"');
    expect(dialogSource).not.toContain('Cash Vault password was not accepted.');
  });
});
