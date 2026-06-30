import {
  getDefaultExpenseAccountSlug,
  getDefaultPaymentAccountSlug,
} from '@/modules/Bookeepz/DefaultExpenseAccount';

export interface BookeepzBootstrapBusiness {
  name: string;
  organizationId: string;
  baseCurrency: string;
}

export interface BookeepzPreferenceAccountIds {
  expenseAccountId: number;
  paymentAccountId: number;
}

export interface BookeepzPreferenceSetting {
  group: string;
  key: string;
  value: string | number | boolean;
}

export function isBlankPreferenceValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  );
}

export function getBookeepzGeneralMetadataDefaults(
  tenantId: number,
  business: BookeepzBootstrapBusiness,
) {
  return {
    tenantId,
    name: business.name,
    baseCurrency: business.baseCurrency,
    location: 'IN',
    language: 'en',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YY',
    fiscalYear: 'april',
  };
}

export function fillMissingMetadataValues<T extends Record<string, any>>(
  existingMetadata: Partial<T> | null | undefined,
  defaults: T,
): T {
  return Object.entries(defaults).reduce((metadata, [key, value]) => {
    const existingValue = existingMetadata?.[key];
    return {
      ...metadata,
      [key]: isBlankPreferenceValue(existingValue) ? value : existingValue,
    };
  }, {} as T);
}

export function buildBookeepzPreferenceSettings({
  expenseAccountId,
  paymentAccountId,
}: BookeepzPreferenceAccountIds): BookeepzPreferenceSetting[] {
  return [
    { group: 'organization', key: 'accounting_basis', value: 'accrual' },
    { group: 'accounts', key: 'account_code_unique', value: true },
    { group: 'accounts', key: 'account_code_required', value: false },
    {
      group: 'bill_payments',
      key: 'withdrawal_account',
      value: paymentAccountId,
    },
    { group: 'items', key: 'preferred_cost_account', value: expenseAccountId },
  ];
}

function isCashVaultAccount(account: Record<string, any>): boolean {
  return account.isCashVault === true || account.is_cash_vault === true;
}

async function findNormalAccountBySlug(
  knex,
  slug: string,
  business: BookeepzBootstrapBusiness,
  accountLabel: 'expense' | 'payment',
) {
  const account = await knex('accounts').where({ slug }).first();
  if (!account || isCashVaultAccount(account)) {
    throw new Error(
      `Bookeepz preference defaults failed for ${business.organizationId}: missing normal ${accountLabel} account ${slug}`,
    );
  }
  return account;
}

async function upsertMissingSetting(
  knex,
  setting: BookeepzPreferenceSetting,
): Promise<void> {
  const existing = await knex('settings')
    .where({ group: setting.group, key: setting.key })
    .first();

  if (!existing) {
    await knex('settings').insert(setting);
    return;
  }
  if (isBlankPreferenceValue(existing.value)) {
    await knex('settings').where({ id: existing.id }).update({
      value: setting.value,
    });
  }
}

export async function ensureBookeepzPreferenceDefaults(
  knex,
  business: BookeepzBootstrapBusiness,
): Promise<void> {
  const expenseAccount = await findNormalAccountBySlug(
    knex,
    getDefaultExpenseAccountSlug(business),
    business,
    'expense',
  );
  const paymentAccount = await findNormalAccountBySlug(
    knex,
    getDefaultPaymentAccountSlug(business),
    business,
    'payment',
  );

  const settings = buildBookeepzPreferenceSettings({
    expenseAccountId: expenseAccount.id,
    paymentAccountId: paymentAccount.id,
  });

  for (const setting of settings) {
    await upsertMissingSetting(knex, setting);
  }
}
