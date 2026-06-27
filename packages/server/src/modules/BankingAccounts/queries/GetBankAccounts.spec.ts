import { GetBankAccountsService } from './GetBankAccounts';

describe('GetBankAccountsService Cash Vault visibility', () => {
  it('filters Cash Vault accounts from normal cashflow account lists without full access', async () => {
    const builder = {
      whereIn: jest.fn(),
      modify: jest.fn(),
      where: jest.fn(),
    };
    const dynamicList = {
      buildQuery: () => jest.fn(),
    };
    const dynamicListService = {
      parseStringifiedFilter: jest.fn((filter) => filter),
      dynamicList: jest.fn().mockResolvedValue(dynamicList),
    };
    const transformer = {
      transform: jest.fn().mockResolvedValue([]),
    };
    const accountModel = jest.fn(() => ({
      query: () => ({
        onBuild: (callback) => {
          callback(builder);
          return Promise.resolve([]);
        },
      }),
    }));
    const cashVaultAccess = {
      canViewCashVault: jest.fn().mockReturnValue({
        allowed: false,
        reason: 'cash_vault_view_permission_required',
      }),
    };
    const service = new (GetBankAccountsService as any)(
      dynamicListService,
      transformer,
      accountModel,
      cashVaultAccess,
    );

    await service.getCashflowAccounts({
      cashVaultAccess: { tenantId: 1, requestedTenantId: 1 },
    });

    expect(builder.where).toHaveBeenCalledWith('is_cash_vault', false);
  });
});
