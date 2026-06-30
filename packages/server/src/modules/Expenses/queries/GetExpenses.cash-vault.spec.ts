import { GetExpensesService } from './GetExpenses.service';
import { GetExpenseService } from './GetExpense.service';

describe('Expenses Cash Vault visibility', () => {
  const makeListService = (
    cashVaultDecision = {
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    },
  ) => {
    const builder = {
      whereNotExists: jest.fn(),
      where: jest.fn(),
      whereColumn: jest.fn(),
      from: jest.fn(),
      select: jest.fn(),
      onBuild: jest.fn(),
      withGraphFetched: jest.fn(),
    };
    builder.whereNotExists.mockImplementation((callback) => {
      callback(builder);
      return builder;
    });
    builder.where.mockReturnValue(builder);
    builder.whereColumn.mockReturnValue(builder);
    builder.from.mockReturnValue(builder);
    builder.select.mockReturnValue(builder);
    builder.onBuild.mockImplementation((callback) => {
      callback(builder);
      return {
        pagination: jest.fn().mockResolvedValue({
          results: [],
          pagination: {},
        }),
      };
    });
    builder.withGraphFetched.mockReturnValue(builder);

    const dynamicList = {
      buildQuery: () => jest.fn(),
      getResponseMeta: jest.fn().mockReturnValue({}),
    };
    const dynamicListService = {
      parseStringifiedFilter: jest.fn((filter) => filter),
      dynamicList: jest.fn().mockResolvedValue(dynamicList),
    };
    const transformer = {
      transform: jest.fn().mockResolvedValue([]),
    };
    const expenseModel = jest.fn(() => ({
      query: () => builder,
    }));
    const cashVaultAccess = {
      getCurrentUserAccess: jest.fn().mockResolvedValue({
        tenantId: 1,
        requestedTenantId: 1,
        permissions: [],
      }),
      canViewCashVault: jest.fn().mockReturnValue(cashVaultDecision),
    };

    const service = new (GetExpensesService as any)(
      transformer,
      dynamicListService,
      expenseModel,
      cashVaultAccess,
    );

    return { service, builder };
  };

  it('filters vault-backed expenses from normal expense lists without full vault scope', async () => {
    const { service, builder } = makeListService();

    await service.getExpensesList({});

    expect(builder.whereNotExists).toHaveBeenCalled();
    expect(builder.where).toHaveBeenCalledWith('accounts.is_cash_vault', true);
    expect(builder.whereColumn).toHaveBeenCalledWith(
      'accounts.id',
      'expenses_transactions.payment_account_id',
    );
  });

  it('does not filter vault-backed expenses when the request has full vault view scope', async () => {
    const { service, builder } = makeListService({ allowed: true } as any);

    await service.getExpensesList({
      cashVaultAccess: { tenantId: 1, requestedTenantId: 1 },
    } as any);

    expect(builder.whereNotExists).not.toHaveBeenCalled();
  });
});

describe('GetExpenseService Cash Vault visibility', () => {
  it('denies a vault-backed expense detail read without full vault scope', async () => {
    const expense = {
      paymentAccount: { isCashVault: true },
    };
    const query = {
      findById: jest.fn().mockReturnThis(),
      withGraphFetched: jest.fn().mockReturnThis(),
      throwIfNotFound: jest.fn().mockResolvedValue(expense),
    };
    const expenseModel = jest.fn(() => ({ query: () => query }));
    const cashVaultAccess = {
      getCurrentUserAccess: jest.fn().mockResolvedValue({
        tenantId: 1,
        requestedTenantId: 1,
        permissions: [],
      }),
      canViewCashVault: jest.fn().mockReturnValue({
        allowed: false,
        reason: 'cash_vault_view_permission_required',
      }),
    };
    const service = new (GetExpenseService as any)(
      { transform: jest.fn() },
      expenseModel,
      cashVaultAccess,
    );

    await expect(service.getExpense(1)).rejects.toThrow(
      'cash_vault_view_permission_required',
    );
  });
});
