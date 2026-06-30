import { CreateExpense } from './CreateExpense.service';

describe('CreateExpense Cash Vault guard', () => {
  const makeService = (
    decision: { allowed: boolean; reason?: string } = {
      allowed: false,
      reason: 'missing',
    },
  ) => {
    const paymentAccount = { id: 31, isCashVault: true };
    const accountModel = jest.fn(() => ({
      query: () => ({
        findById: jest.fn().mockReturnValue({
          throwIfNotFound: jest.fn().mockResolvedValue(paymentAccount),
        }),
        whereIn: jest.fn().mockResolvedValue([{ id: 40 }]),
      }),
    }));
    const validator = {
      validateExpensesAccountsExistance: jest.fn(),
      validatePaymentAccountType: jest.fn(),
      validateExpensesAccountsType: jest.fn(),
      validateCategoriesNotEqualZero: jest.fn(),
    };
    const cashVaultAccess = {
      getCurrentUserAccess: jest.fn().mockResolvedValue({
        tenantId: 1,
        requestedTenantId: 1,
      }),
      canCreateCashVaultEntry: jest.fn().mockReturnValue(decision),
    };
    const service = new (CreateExpense as any)(
      { emitAsync: jest.fn() },
      { withTransaction: jest.fn() },
      validator,
      { expenseCreateDTO: jest.fn() },
      accountModel,
      jest.fn(),
      cashVaultAccess,
    );

    return { service, validator };
  };

  const expenseDto = {
    paymentAccountId: 31,
    paymentDate: '2026-06-27',
    currencyCode: 'INR',
    exchangeRate: 1,
    categories: [{ expenseAccountId: 40, amount: 100, index: 1 }],
  };

  it('rejects normal expense creation with a Cash Vault payment account', async () => {
    const { service } = makeService({
      allowed: false,
      reason: 'cash_vault_entry_permission_required',
    });

    await expect((service as any).authorize(expenseDto)).rejects.toThrow(
      'cash_vault_entry_permission_required',
    );
  });

  it('allows Cash Vault scoped expense creation with a Cash Vault payment account', async () => {
    const { service, validator } = makeService({ allowed: true });

    await expect((service as any).authorize(expenseDto)).resolves.toBeUndefined();
    expect(validator.validatePaymentAccountType).toHaveBeenCalled();
  });
});
