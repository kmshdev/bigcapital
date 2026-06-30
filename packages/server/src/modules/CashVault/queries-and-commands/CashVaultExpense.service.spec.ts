import { CashVaultExpenseService } from './CashVaultExpense.service';

describe('CashVaultExpenseService', () => {
  it('lists expenses paid from the Cash Vault entry target only', async () => {
    const accountRepository = {
      findCashVaultEntryTarget: jest.fn().mockResolvedValue({ id: 31 }),
    };
    const getExpenses = {
      getExpensesList: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
    };
    const service = new CashVaultExpenseService(
      accountRepository as any,
      getExpenses as any,
      { newExpense: jest.fn() } as any,
    );

    await service.listExpenses();

    const listQuery = getExpenses.getExpensesList.mock.calls[0][0];
    expect(listQuery.includeCashVaultExpenses).toBe(true);
    const filterQuery = listQuery.filterQuery;
    const builder = { where: jest.fn() };
    filterQuery(builder);
    expect(builder.where).toHaveBeenCalledWith('payment_account_id', 31);
  });

  it('creates expenses using the server-resolved Cash Vault payment account', async () => {
    const accountRepository = {
      findCashVaultEntryTarget: jest.fn().mockResolvedValue({ id: 31 }),
    };
    const createExpense = {
      newExpense: jest.fn().mockResolvedValue({ id: 99 }),
    };
    const service = new CashVaultExpenseService(
      accountRepository as any,
      { getExpensesList: jest.fn() } as any,
      createExpense as any,
    );
    const dto = {
      paymentDate: '2026-06-27',
      description: 'Fuel',
      currencyCode: 'INR',
      exchangeRate: 1,
      categories: [{ expenseAccountId: 40, amount: 100 }],
    };

    await expect(service.createExpense(dto as any)).resolves.toEqual({ id: 99 });
    expect(createExpense.newExpense).toHaveBeenCalledWith({
      ...dto,
      paymentAccountId: 31,
      currencyCode: 'INR',
      exchangeRate: 1,
      publish: true,
      categories: [{ expenseAccountId: 40, amount: 100, index: 1 }],
    });
  });
});
