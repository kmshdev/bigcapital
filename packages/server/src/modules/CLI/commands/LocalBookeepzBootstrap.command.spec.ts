import {
  BOOTSTRAP_BUSINESSES,
  BOOTSTRAP_USERS,
  CASH_VAULT_PASSWORD_KEYS,
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
  USER_PASSWORD_KEYS,
  parseBootstrapSecrets,
} from './LocalBookeepzBootstrap.command';

describe('LocalBookeepzBootstrapCommand contract', () => {
  it('pins the four isolated Risingstone/Mahetel businesses', () => {
    expect(BOOTSTRAP_BUSINESSES.map((business) => business.name)).toEqual([
      'Risingstone infra pvt ltd',
      'Risingstone ventures pvt ltd',
      'Risingstone projects pvt Ltd',
      'Mahetel pvt ltd',
    ]);
    expect(BOOTSTRAP_BUSINESSES.every((business) => business.baseCurrency)).toBe(
      true,
    );
    expect(BOOTSTRAP_BUSINESSES.map((business) => business.baseCurrency)).toEqual(
      ['INR', 'INR', 'INR', 'INR'],
    );
  });

  it('derives one default expense account name and slug per business', () => {
    expect(
      BOOTSTRAP_BUSINESSES.map((business) => ({
        name: getDefaultExpenseAccountName(business),
        slug: getDefaultExpenseAccountSlug(business),
      })),
    ).toEqual([
      {
        name: 'Risingstone infra pvt ltd_main_01',
        slug: 'risingstone_infra_pvt_ltd-main-01',
      },
      {
        name: 'Risingstone ventures pvt ltd_main_01',
        slug: 'risingstone_ventures_pvt_ltd-main-01',
      },
      {
        name: 'Risingstone projects pvt Ltd_main_01',
        slug: 'risingstone_projects_pvt_ltd-main-01',
      },
      {
        name: 'Mahetel pvt ltd_main_01',
        slug: 'mahetel_pvt_ltd-main-01',
      },
    ]);
  });

  it('pins the three login users and password env keys', () => {
    expect(BOOTSTRAP_USERS).toEqual([
      {
        email: 'adminF0@bookeepz.net',
        firstName: 'Admin',
        lastName: 'F0',
        membershipRole: 'owner',
      },
      {
        email: 'adminF1@bookeepz.net',
        firstName: 'Admin',
        lastName: 'F1',
        membershipRole: 'owner',
      },
      {
        email: 'acca0@bookeepz.net',
        firstName: 'Accountant',
        lastName: 'A0',
        membershipRole: 'member',
      },
    ]);
    expect(USER_PASSWORD_KEYS).toEqual([
      'ADMINF0_PASSWORD',
      'ADMINF1_PASSWORD',
      'ACCA0_PASSWORD',
    ]);
    expect(CASH_VAULT_PASSWORD_KEYS).toEqual([
      'ADMINF0_CASH_VAULT_PASSWORD',
      'ADMINF1_CASH_VAULT_PASSWORD',
      'ACCA0_CASH_VAULT_PASSWORD',
    ]);
  });

  it('parses login and cash-vault secrets from .user.env content', () => {
    const secrets = parseBootstrapSecrets([
      'ADMINF0_PASSWORD=login-0',
      'ADMINF1_PASSWORD=login-1',
      'ACCA0_PASSWORD=login-2',
      'ADMINF0_CASH_VAULT_PASSWORD=cash-0',
      'ADMINF1_CASH_VAULT_PASSWORD=cash-1',
      'ACCA0_CASH_VAULT_PASSWORD=cash-2',
    ].join('\n'));

    expect(secrets.loginPasswords['adminF0@bookeepz.net']).toBe('login-0');
    expect(secrets.loginPasswords['adminF1@bookeepz.net']).toBe('login-1');
    expect(secrets.loginPasswords['acca0@bookeepz.net']).toBe('login-2');
    expect(secrets.cashVaultPasswords['adminF0@bookeepz.net']).toBe('cash-0');
    expect(secrets.cashVaultPasswords['adminF1@bookeepz.net']).toBe('cash-1');
    expect(secrets.cashVaultPasswords['acca0@bookeepz.net']).toBe('cash-2');
  });
});
