import { BalanceSheetRepository } from './BalanceSheetRepository';

describe('BalanceSheetRepository net income account initialization', () => {
  it('treats missing income parent accounts as an empty group', () => {
    const repository = new BalanceSheetRepository() as any;
    repository.accountsByParentType = new Map();

    expect(() => repository.initIncomeAccounts()).not.toThrow();
    expect(repository.incomeAccounts).toEqual([]);
    expect(repository.incomeAccountsIds).toEqual([]);
  });

  it('treats missing expense parent accounts as an empty group', () => {
    const repository = new BalanceSheetRepository() as any;
    repository.accountsByParentType = new Map();

    expect(() => repository.initExpenseAccounts()).not.toThrow();
    expect(repository.expenseAccounts).toEqual([]);
    expect(repository.expenseAccountsIds).toEqual([]);
  });
});
