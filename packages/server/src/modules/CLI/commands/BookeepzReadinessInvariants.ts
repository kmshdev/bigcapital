import {
  BOOTSTRAP_BUSINESSES,
  getCashVaultLedgerName,
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
  getDefaultPaymentAccountName,
  getDefaultPaymentAccountSlug,
} from './LocalBookeepzBootstrap.command';
import { ReadinessFailure } from './BookeepzReadinessEnv';

type Business = (typeof BOOTSTRAP_BUSINESSES)[number];
type AccountRow = Record<string, any>;

function failure(
  target: string,
  message: string,
  operation = 'bootstrap.check',
): ReadinessFailure {
  return {
    class: 'bootstrap_incomplete',
    operation,
    target,
    message,
  };
}

function bool(value: any) {
  return value === true || value === 1 || value === '1';
}

function normalizeExpectedValue(actual: any, expected: any) {
  return typeof expected === 'boolean' ? bool(actual) : actual;
}

function findBySlug(accounts: AccountRow[], slug: string) {
  return accounts.find((account) => account.slug === slug);
}

export function evaluateTenantInvariants(tenants: AccountRow[]) {
  const failures: ReadinessFailure[] = [];
  for (const business of BOOTSTRAP_BUSINESSES) {
    const tenant = tenants.find(
      (row) => row.organizationId === business.organizationId,
    );
    if (!tenant) {
      failures.push(
        failure(business.organizationId, 'Bookeepz tenant is missing.'),
      );
      continue;
    }
    for (const key of ['initializedAt', 'seededAt', 'builtAt']) {
      if (!tenant[key]) {
        failures.push(
          failure(
            `${business.organizationId}:${key}`,
            `Tenant is missing ${key}.`,
          ),
        );
      }
    }
  }
  return { failures };
}

export function evaluateAccountInvariants(input: {
  business: Business;
  accounts: AccountRow[];
}) {
  const { business, accounts } = input;
  const failures: ReadinessFailure[] = [];
  const expense = findBySlug(accounts, getDefaultExpenseAccountSlug(business));
  const payment = findBySlug(accounts, getDefaultPaymentAccountSlug(business));
  const cashVault = findBySlug(accounts, 'bookeepz-hidden-cash-vault');

  if (!expense) {
    failures.push(
      failure(
        `${business.organizationId}:expense`,
        'Default expense account is missing.',
      ),
    );
  } else {
    const expected = {
      name: getDefaultExpenseAccountName(business),
      accountType: 'expense',
      code: 'EXPMAIN01',
      currencyCode: 'INR',
      active: true,
      predefined: false,
    };
    for (const [key, value] of Object.entries(expected)) {
      const actual = normalizeExpectedValue(expense[key], value);
      if (actual !== value) {
        failures.push(
          failure(
            `${business.organizationId}:${expense.slug}:${key}`,
            `Expected ${key} to equal ${String(value)}.`,
          ),
        );
      }
    }
  }

  if (!payment) {
    failures.push(
      failure(
        `${business.organizationId}:payment`,
        'Default payment account is missing.',
      ),
    );
  } else {
    const expected = {
      name: getDefaultPaymentAccountName(business),
      accountType: 'bank',
      code: 'PAYMAIN01',
      currencyCode: 'INR',
      active: true,
      predefined: false,
      isCashVault: false,
    };
    for (const [key, value] of Object.entries(expected)) {
      const actual = normalizeExpectedValue(payment[key], value);
      if (actual !== value) {
        failures.push(
          failure(
            `${business.organizationId}:${payment.slug}:${key}`,
            `Expected ${key} to equal ${String(value)}.`,
          ),
        );
      }
    }
  }

  if (!cashVault) {
    failures.push(
      failure(
        `${business.organizationId}:bookeepz-hidden-cash-vault`,
        'Cash Vault account is missing.',
      ),
    );
  } else {
    const expectedName = getCashVaultLedgerName(business.organizationId);
    if (
      cashVault.name !== expectedName ||
      !/^TEST_LEDGER_\d{6}$/.test(cashVault.name)
    ) {
      failures.push(
        failure(
          `${business.organizationId}:bookeepz-hidden-cash-vault:name`,
          'Cash Vault name must match deterministic TEST_LEDGER_ followed by six digits.',
        ),
      );
    }
    const expected = {
      accountType: 'cash',
      code: 'CASH-VAULT',
      currencyCode: 'INR',
      active: true,
      predefined: false,
      isCashVault: true,
      cashVaultEntryEnabled: true,
    };
    for (const [key, value] of Object.entries(expected)) {
      const actual = normalizeExpectedValue(cashVault[key], value);
      if (actual !== value) {
        failures.push(
          failure(
            `${business.organizationId}:bookeepz-hidden-cash-vault:${key}`,
            `Expected ${key} to equal ${String(value)}.`,
          ),
        );
      }
    }
  }

  return { failures };
}

export function evaluateDesignatedAdmins(input: {
  organizationId: string;
  rows: { email: string }[];
}) {
  const emails = input.rows.map((row) => row.email).sort();
  const expected = ['adminF0@bookeepz.net', 'adminF1@bookeepz.net'].sort();
  if (JSON.stringify(emails) !== JSON.stringify(expected)) {
    return {
      failures: [
        failure(
          `${input.organizationId}:cash_vault_designated_admins`,
          'Designated admins must be exactly adminF0@bookeepz.net and adminF1@bookeepz.net.',
        ),
      ],
    };
  }
  return { failures: [] as ReadinessFailure[] };
}
