import {
  BOOTSTRAP_BUSINESSES,
  BOOTSTRAP_USERS,
  CASH_VAULT_PASSWORD_KEYS,
  getCashVaultLedgerName,
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
  getDefaultPaymentAccountName,
  getDefaultPaymentAccountSlug,
  USER_PASSWORD_KEYS,
  parseBootstrapSecrets,
} from './LocalBookeepzBootstrap.command';
import {
  buildBookeepzPreferenceSettings,
  ensureBookeepzPreferenceDefaults,
  fillMissingMetadataValues,
  getBookeepzGeneralMetadataDefaults,
  isBlankPreferenceValue,
} from './BookeepzPreferenceDefaults';

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

  it('derives one normal payment account name and slug per business', () => {
    expect(
      BOOTSTRAP_BUSINESSES.map((business) => ({
        name: getDefaultPaymentAccountName(business),
        slug: getDefaultPaymentAccountSlug(business),
      })),
    ).toEqual([
      {
        name: 'Risingstone infra pvt ltd_payment_01',
        slug: 'risingstone_infra_pvt_ltd-payment-01',
      },
      {
        name: 'Risingstone ventures pvt ltd_payment_01',
        slug: 'risingstone_ventures_pvt_ltd-payment-01',
      },
      {
        name: 'Risingstone projects pvt Ltd_payment_01',
        slug: 'risingstone_projects_pvt_ltd-payment-01',
      },
      {
        name: 'Mahetel pvt ltd_payment_01',
        slug: 'mahetel_pvt_ltd-payment-01',
      },
    ]);
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

  it('derives opaque Cash Vault ledger names per business', () => {
    const names = BOOTSTRAP_BUSINESSES.map((business) =>
      getCashVaultLedgerName(business.organizationId),
    );

    expect(names).toHaveLength(new Set(names).size);
    expect(names).toEqual(
      names.map(() => expect.stringMatching(/^TEST_LEDGER_\d{6}$/)),
    );
  });

  it('pins the three login users and password env keys', () => {
    expect(BOOTSTRAP_USERS).toEqual([
      {
        email: 'adminF0@bookeepz.net',
        firstName: 'Admin',
        lastName: 'F0',
        membershipRole: 'owner',
        tenantRoleSlug: 'admin',
      },
      {
        email: 'adminF1@bookeepz.net',
        firstName: 'Admin',
        lastName: 'F1',
        membershipRole: 'owner',
        tenantRoleSlug: 'admin',
      },
      {
        email: 'acca0@bookeepz.net',
        firstName: 'Accountant',
        lastName: 'A0',
        membershipRole: 'member',
        tenantRoleSlug: 'accountant',
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

describe('Bookeepz preference default helpers', () => {
  const business = BOOTSTRAP_BUSINESSES[0];

  it('treats null, undefined, and empty strings as missing values', () => {
    expect(isBlankPreferenceValue(undefined)).toBe(true);
    expect(isBlankPreferenceValue(null)).toBe(true);
    expect(isBlankPreferenceValue('')).toBe(true);
    expect(isBlankPreferenceValue('   ')).toBe(true);
    expect(isBlankPreferenceValue(false)).toBe(false);
    expect(isBlankPreferenceValue(0)).toBe(false);
    expect(isBlankPreferenceValue('cash')).toBe(false);
  });

  it('builds the General metadata defaults used by the preferences page', () => {
    expect(getBookeepzGeneralMetadataDefaults(10, business)).toEqual({
      tenantId: 10,
      name: 'Risingstone infra pvt ltd',
      baseCurrency: 'INR',
      location: 'IN',
      language: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YY',
      fiscalYear: 'april',
    });
  });

  it('fills only missing metadata values and preserves configured values', () => {
    const defaults = getBookeepzGeneralMetadataDefaults(10, business);

    expect(
      fillMissingMetadataValues(
        {
          tenantId: 10,
          name: 'Configured org name',
          baseCurrency: 'USD',
          location: '',
          language: null,
          timezone: 'Europe/London',
          dateFormat: undefined,
          fiscalYear: 'january',
        },
        defaults,
      ),
    ).toEqual({
      tenantId: 10,
      name: 'Configured org name',
      baseCurrency: 'USD',
      location: 'IN',
      language: 'en',
      timezone: 'Europe/London',
      dateFormat: 'DD/MM/YY',
      fiscalYear: 'january',
    });
  });

  it('normalizes legacy metadata values that render blank in General preferences', () => {
    const defaults = getBookeepzGeneralMetadataDefaults(10, business);

    expect(
      fillMissingMetadataValues(
        {
          tenantId: 10,
          name: business.name,
          baseCurrency: 'INR',
          location: 'IN',
          language: 'en',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          fiscalYear: '1',
        },
        defaults,
      ),
    ).toEqual({
      tenantId: 10,
      name: business.name,
      baseCurrency: 'INR',
      location: 'IN',
      language: 'en',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YY',
      fiscalYear: 'april',
    });
  });

  it('builds only the semantically valid Accountant and Items settings', () => {
    const settings = buildBookeepzPreferenceSettings({
      expenseAccountId: 31,
      paymentAccountId: 41,
    });

    expect(settings).toEqual([
      { group: 'organization', key: 'accounting_basis', value: 'accrual' },
      { group: 'accounts', key: 'account_code_unique', value: true },
      { group: 'accounts', key: 'account_code_required', value: false },
      { group: 'bill_payments', key: 'withdrawal_account', value: 41 },
      { group: 'items', key: 'preferred_cost_account', value: 31 },
    ]);
    expect(settings).not.toContainEqual(
      expect.objectContaining({
        group: 'items',
        key: 'preferred_sell_account',
      }),
    );
    expect(settings).not.toContainEqual(
      expect.objectContaining({
        group: 'items',
        key: 'preferred_inventory_account',
      }),
    );
    expect(settings).not.toContainEqual(
      expect.objectContaining({
        group: 'payment_receives',
      }),
    );
  });
});

function createKnexMock({
  accounts = [],
  settings = [],
}: {
  accounts?: Record<string, any>[];
  settings?: Record<string, any>[];
}) {
  const rowsByTable = {
    accounts: accounts.map((row) => ({ ...row })),
    settings: settings.map((row) => ({ ...row })),
  };
  const calls = {
    inserts: [] as Array<{ table: string; payload: any }>,
    updates: [] as Array<{ table: string; filter: any; payload: any }>,
  };

  const matches = (row: Record<string, any>, filter: Record<string, any>) =>
    Object.entries(filter).every(([key, value]) => row[key] === value);

  const knex: any = (table: 'accounts' | 'settings') => ({
    where(filter: Record<string, any>) {
      return {
        first: async () =>
          rowsByTable[table].find((row) => matches(row, filter)) || undefined,
        update: async (payload: Record<string, any>) => {
          calls.updates.push({ table, filter, payload });
          let count = 0;
          rowsByTable[table] = rowsByTable[table].map((row) => {
            if (!matches(row, filter)) {
              return row;
            }
            count += 1;
            return { ...row, ...payload };
          });
          return count;
        },
      };
    },
    insert: async (payload: Record<string, any>) => {
      const row = {
        id: rowsByTable[table].length + 1,
        ...payload,
      };
      rowsByTable[table].push(row);
      calls.inserts.push({ table, payload });
      return [row.id];
    },
  });

  return { knex, rowsByTable, calls };
}

describe('ensureBookeepzPreferenceDefaults', () => {
  const business = BOOTSTRAP_BUSINESSES[0];

  it('fills missing settings and preserves non-blank configured values', async () => {
    const { knex, rowsByTable } = createKnexMock({
      accounts: [
        {
          id: 31,
          slug: 'risingstone_infra_pvt_ltd-main-01',
          accountType: 'expense',
          isCashVault: false,
        },
        {
          id: 41,
          slug: 'risingstone_infra_pvt_ltd-payment-01',
          accountType: 'bank',
          isCashVault: false,
        },
      ],
      settings: [
        {
          id: 1,
          group: 'organization',
          key: 'accounting_basis',
          value: '',
        },
        {
          id: 2,
          group: 'accounts',
          key: 'account_code_unique',
          value: false,
        },
        {
          id: 3,
          group: 'items',
          key: 'preferred_sell_account',
          value: 999,
        },
      ],
    });

    await ensureBookeepzPreferenceDefaults(knex, business);

    expect(rowsByTable.settings).toEqual(
      expect.arrayContaining([
        {
          id: 1,
          group: 'organization',
          key: 'accounting_basis',
          value: 'accrual',
        },
        {
          id: 2,
          group: 'accounts',
          key: 'account_code_unique',
          value: false,
        },
        {
          id: 3,
          group: 'items',
          key: 'preferred_sell_account',
          value: 999,
        },
        {
          id: 4,
          group: 'accounts',
          key: 'account_code_required',
          value: false,
        },
        {
          id: 5,
          group: 'bill_payments',
          key: 'withdrawal_account',
          value: 41,
        },
        {
          id: 6,
          group: 'items',
          key: 'preferred_cost_account',
          value: 31,
        },
      ]),
    );
    expect(rowsByTable.settings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          group: 'items',
          key: 'preferred_inventory_account',
        }),
        expect.objectContaining({
          group: 'payment_receives',
        }),
      ]),
    );
  });

  it('fails clearly when the normal Bookeepz expense account is missing', async () => {
    const { knex } = createKnexMock({
      accounts: [
        {
          id: 41,
          slug: 'risingstone_infra_pvt_ltd-payment-01',
          accountType: 'bank',
          isCashVault: false,
        },
      ],
    });

    await expect(ensureBookeepzPreferenceDefaults(knex, business)).rejects.toThrow(
      'Bookeepz preference defaults failed for risingstone_infra_pvt_ltd: missing normal expense account risingstone_infra_pvt_ltd-main-01',
    );
  });

  it('fails clearly when the normal Bookeepz payment account is missing', async () => {
    const { knex } = createKnexMock({
      accounts: [
        {
          id: 31,
          slug: 'risingstone_infra_pvt_ltd-main-01',
          accountType: 'expense',
          isCashVault: false,
        },
      ],
    });

    await expect(ensureBookeepzPreferenceDefaults(knex, business)).rejects.toThrow(
      'Bookeepz preference defaults failed for risingstone_infra_pvt_ltd: missing normal payment account risingstone_infra_pvt_ltd-payment-01',
    );
  });
});
