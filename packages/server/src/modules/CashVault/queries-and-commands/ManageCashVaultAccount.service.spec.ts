import { ManageCashVaultAccountService } from './ManageCashVaultAccount.service';

describe('ManageCashVaultAccountService', () => {
  it('returns opaque ledger names for Cash Vault accounts', async () => {
    const accountRepository = {
      listCashVaultAccounts: jest.fn().mockResolvedValue([
        {
          id: 31,
          name: 'TEST_LEDGER_429909',
          isCashVault: true,
          cashVaultEntryEnabled: true,
        },
      ]),
    };
    const service = new ManageCashVaultAccountService(
      accountRepository as any,
      {} as any,
    );

    await expect(service.listAccounts()).resolves.toEqual([
      {
        id: 31,
        name: 'TEST_LEDGER_429909',
        isCashVault: true,
        cashVaultEntryEnabled: true,
      },
    ]);
  });

  it('masks stale Cash Vault account names', async () => {
    const accountRepository = {
      listCashVaultAccounts: jest.fn().mockResolvedValue([
        {
          id: 31,
          name: 'Hidden Cash Vault',
          isCashVault: true,
          cashVaultEntryEnabled: true,
        },
      ]),
    };
    const service = new ManageCashVaultAccountService(
      accountRepository as any,
      {} as any,
    );

    await expect(service.listAccounts()).resolves.toEqual([
      {
        id: 31,
        name: expect.stringMatching(/^TEST_LEDGER_\d{6}$/),
        isCashVault: true,
        cashVaultEntryEnabled: true,
      },
    ]);
  });

  it('rejects non-cash accounts when designating a Cash Vault account', async () => {
    const accountRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 11,
        accountType: 'expense',
      }),
    };
    const service = new ManageCashVaultAccountService(
      accountRepository as any,
      {} as any,
    );

    await expect(
      service.designateAccount({
        accountId: 11,
        entryEnabled: false,
        userId: 3,
      }),
    ).rejects.toThrow('Only cash accounts can be marked as Cash Vault.');
  });

  it('clears any previous Help-menu entry target before enabling the selected account', async () => {
    const accountRepository = {
      findById: jest.fn().mockResolvedValue({
        id: 12,
        accountType: 'cash',
      }),
      clearEntryTargets: jest.fn().mockResolvedValue(undefined),
      markCashVault: jest.fn().mockResolvedValue({
        id: 12,
        isCashVault: true,
        cashVaultEntryEnabled: true,
      }),
    };
    const service = new ManageCashVaultAccountService(
      accountRepository as any,
      {} as any,
    );

    await expect(
      service.designateAccount({
        accountId: 12,
        entryEnabled: true,
        userId: 3,
      }),
    ).resolves.toEqual({
      id: 12,
      isCashVault: true,
      cashVaultEntryEnabled: true,
    });
    expect(
      accountRepository.clearEntryTargets.mock.invocationCallOrder[0],
    ).toBeLessThan(accountRepository.markCashVault.mock.invocationCallOrder[0]);
  });
});
