import { CreateCashVaultEntryService } from './CreateCashVaultEntry.service';

describe('CreateCashVaultEntryService', () => {
  it('resolves the tenant entry target and delegates to banking transactions without Plaid fields', async () => {
    const accountRepository = {
      findCashVaultEntryTarget: jest.fn().mockResolvedValue({ id: 31 }),
      findById: jest.fn().mockResolvedValue({
        id: 41,
        isCashVault: false,
      }),
    };
    const bankingTransactionsApplication = {
      createTransaction: jest.fn().mockResolvedValue({ id: 90 }),
    };
    const service = new CreateCashVaultEntryService(
      accountRepository as any,
      bankingTransactionsApplication as any,
    );

    await expect(
      service.createEntry({
        transactionType: 'deposit',
        amount: 1250,
        date: '2026-06-27',
        description: 'Cash top up',
        offsetAccountId: 41,
      }),
    ).resolves.toEqual({
      transactionId: 90,
      transactionType: 'deposit',
      amount: 1250,
      date: '2026-06-27',
    });

    expect(bankingTransactionsApplication.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionType: 'deposit',
        amount: 1250,
        date: '2026-06-27',
        description: 'Cash top up',
        cashflowAccountId: 31,
        creditAccountId: 41,
        currencyCode: 'INR',
        exchangeRate: 1,
        publish: true,
      }),
    );
    expect(
      bankingTransactionsApplication.createTransaction.mock.calls[0][0],
    ).not.toHaveProperty('plaidTransactionId');
    expect(
      bankingTransactionsApplication.createTransaction.mock.calls[0][0],
    ).not.toHaveProperty('plaidAccountId');
  });

  it('fails when the tenant has no Help-menu Cash Vault entry target', async () => {
    const service = new CreateCashVaultEntryService(
      { findCashVaultEntryTarget: jest.fn().mockResolvedValue(null) } as any,
      { createTransaction: jest.fn() } as any,
    );

    await expect(
      service.createEntry({
        transactionType: 'withdrawal',
        amount: 500,
        date: '2026-06-27',
        description: 'Cash withdrawal',
        offsetAccountId: 41,
      }),
    ).rejects.toThrow('cash_vault_entry_target_not_configured');
  });

  it('fails when the offset account is missing', async () => {
    const bankingTransactionsApplication = { createTransaction: jest.fn() };
    const service = new CreateCashVaultEntryService(
      {
        findCashVaultEntryTarget: jest.fn().mockResolvedValue({ id: 31 }),
        findById: jest.fn().mockResolvedValue(null),
      } as any,
      bankingTransactionsApplication as any,
    );

    await expect(
      service.createEntry({
        transactionType: 'deposit',
        amount: 500,
        date: '2026-06-27',
        description: 'Cash top up',
        offsetAccountId: 1,
      }),
    ).rejects.toThrow('cash_vault_offset_account_not_configured');
    expect(
      bankingTransactionsApplication.createTransaction,
    ).not.toHaveBeenCalled();
  });

  it('fails when the offset account is the hidden vault account', async () => {
    const bankingTransactionsApplication = { createTransaction: jest.fn() };
    const service = new CreateCashVaultEntryService(
      {
        findCashVaultEntryTarget: jest.fn().mockResolvedValue({ id: 31 }),
        findById: jest.fn().mockResolvedValue({
          id: 31,
          isCashVault: true,
        }),
      } as any,
      bankingTransactionsApplication as any,
    );

    await expect(
      service.createEntry({
        transactionType: 'withdrawal',
        amount: 500,
        date: '2026-06-27',
        description: 'Cash withdrawal',
        offsetAccountId: 31,
      }),
    ).rejects.toThrow('cash_vault_offset_account_not_configured');
    expect(
      bankingTransactionsApplication.createTransaction,
    ).not.toHaveBeenCalled();
  });
});
