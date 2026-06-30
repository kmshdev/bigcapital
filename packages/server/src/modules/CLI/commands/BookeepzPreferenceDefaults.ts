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
