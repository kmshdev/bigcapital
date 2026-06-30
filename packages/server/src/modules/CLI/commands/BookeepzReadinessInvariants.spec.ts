import * as bcrypt from 'bcrypt';
import {
  evaluateAccountInvariants,
  evaluateDesignatedAdmins,
  evaluateTenantInvariants,
} from './BookeepzReadinessInvariants';
import { evaluateCredentialMatches } from './BookeepzReadinessDatabase';

describe('BookeepzReadinessInvariants', () => {
  it('passes tenant invariants for the four Bookeepz companies', () => {
    const result = evaluateTenantInvariants([
      {
        id: 1,
        organizationId: 'risingstone_infra_pvt_ltd',
        initializedAt: new Date(),
        seededAt: new Date(),
        builtAt: new Date(),
      },
      {
        id: 2,
        organizationId: 'risingstone_ventures_pvt_ltd',
        initializedAt: new Date(),
        seededAt: new Date(),
        builtAt: new Date(),
      },
      {
        id: 3,
        organizationId: 'risingstone_projects_pvt_ltd',
        initializedAt: new Date(),
        seededAt: new Date(),
        builtAt: new Date(),
      },
      {
        id: 4,
        organizationId: 'mahetel_pvt_ltd',
        initializedAt: new Date(),
        seededAt: new Date(),
        builtAt: new Date(),
      },
    ]);

    expect(result.failures).toEqual([]);
  });

  it('requires the default expense, payment, and Cash Vault accounts for each company', () => {
    const result = evaluateAccountInvariants({
      business: {
        name: 'Risingstone infra pvt ltd',
        organizationId: 'risingstone_infra_pvt_ltd',
        baseCurrency: 'INR',
      },
      accounts: [
        {
          slug: 'risingstone_infra_pvt_ltd-main-01',
          name: 'Risingstone infra pvt ltd_main_01',
          accountType: 'expense',
          code: 'EXPMAIN01',
          currencyCode: 'INR',
          active: 1,
          predefined: 0,
        },
        {
          slug: 'risingstone_infra_pvt_ltd-payment-01',
          name: 'Risingstone infra pvt ltd_payment_01',
          accountType: 'bank',
          code: 'PAYMAIN01',
          currencyCode: 'INR',
          active: 1,
          predefined: 0,
          isCashVault: 0,
        },
        {
          slug: 'bookeepz-hidden-cash-vault',
          name: 'TEST_LEDGER_429909',
          accountType: 'cash',
          code: 'CASH-VAULT',
          currencyCode: 'INR',
          active: 1,
          predefined: 0,
          isCashVault: 1,
          cashVaultEntryEnabled: 1,
        },
      ],
    });

    expect(result.failures).toEqual([]);
  });

  it('rejects stale Hidden Cash Vault display names', () => {
    const result = evaluateAccountInvariants({
      business: {
        name: 'Risingstone infra pvt ltd',
        organizationId: 'risingstone_infra_pvt_ltd',
        baseCurrency: 'INR',
      },
      accounts: [
        {
          slug: 'bookeepz-hidden-cash-vault',
          name: 'Hidden Cash Vault',
          accountType: 'cash',
          code: 'CASH-VAULT',
          currencyCode: 'INR',
          active: true,
          predefined: false,
          isCashVault: true,
          cashVaultEntryEnabled: true,
        },
      ],
    });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: 'bootstrap_incomplete',
          target: 'risingstone_infra_pvt_ltd:bookeepz-hidden-cash-vault:name',
        }),
      ]),
    );
  });

  it('requires exactly adminF0 and adminF1 as designated admins', () => {
    const result = evaluateDesignatedAdmins({
      organizationId: 'risingstone_infra_pvt_ltd',
      rows: [
        { email: 'adminF0@bookeepz.net' },
        { email: 'adminF1@bookeepz.net' },
      ],
    });

    expect(result.failures).toEqual([]);
  });
});

describe('BookeepzReadinessDatabase credential evaluation', () => {
  it('returns bcrypt match booleans without returning passwords or hashes', async () => {
    const result = await evaluateCredentialMatches({
      organizationId: 'risingstone_infra_pvt_ltd',
      loginPasswords: {
        'adminF0@bookeepz.net': 'login-0',
        'adminF1@bookeepz.net': 'login-1',
        'acca0@bookeepz.net': 'login-2',
      },
      cashVaultPasswords: {
        'adminF0@bookeepz.net': 'cash-0',
        'adminF1@bookeepz.net': 'cash-1',
        'acca0@bookeepz.net': 'cash-2',
      },
      systemUsers: [
        {
          id: 10,
          email: 'adminF0@bookeepz.net',
          password: await bcrypt.hash('login-0', 4),
        },
        {
          id: 11,
          email: 'adminF1@bookeepz.net',
          password: await bcrypt.hash('login-1', 4),
        },
        {
          id: 12,
          email: 'acca0@bookeepz.net',
          password: await bcrypt.hash('login-2', 4),
        },
      ],
      cashVaultCredentials: [
        {
          userId: 10,
          email: 'adminF0@bookeepz.net',
          passwordHash: await bcrypt.hash('cash-0', 4),
        },
        {
          userId: 11,
          email: 'adminF1@bookeepz.net',
          passwordHash: await bcrypt.hash('cash-1', 4),
        },
        {
          userId: 12,
          email: 'acca0@bookeepz.net',
          passwordHash: await bcrypt.hash('cash-2', 4),
        },
      ],
    });

    expect(result.failures).toEqual([]);
    expect(result.matches['adminF0@bookeepz.net']).toEqual({
      loginPassword: true,
      cashVaultPassword: true,
    });
    expect(JSON.stringify(result)).not.toContain('login-0');
    expect(JSON.stringify(result)).not.toContain('cash-0');
    expect(JSON.stringify(result)).not.toContain('$2');
  });
});
