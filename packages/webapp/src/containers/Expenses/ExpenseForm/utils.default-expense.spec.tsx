// @ts-nocheck
import {
  findDefaultExpenseAccount,
  makeDefaultExpenseEntry,
} from './utils';

describe('expense form default expense account', () => {
  it('uses the business main expense account for new expense rows', () => {
    const accounts = [
      {
        id: 11,
        slug: 'bank-main',
        account_type: 'bank',
      },
      {
        id: 12,
        slug: 'risingstone_infra_pvt_ltd-main-01',
        account_type: 'expense',
      },
    ];

    expect(findDefaultExpenseAccount(accounts)).toEqual(accounts[1]);
    expect(makeDefaultExpenseEntry(accounts)).toMatchObject({
      expense_account_id: 12,
    });
  });

  it('does not default to hidden or non-expense accounts', () => {
    const accounts = [
      {
        id: 21,
        slug: 'risingstone_infra_pvt_ltd-main-01',
        account_type: 'cash',
      },
      {
        id: 22,
        slug: 'normal-expense',
        account_type: 'expense',
      },
    ];

    expect(findDefaultExpenseAccount(accounts)).toBeUndefined();
    expect(makeDefaultExpenseEntry(accounts)).toMatchObject({
      expense_account_id: '',
    });
  });
});
