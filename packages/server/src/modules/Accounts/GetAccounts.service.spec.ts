import { GetAccountsService } from './GetAccounts.service';

describe('GetAccountsService Cash Vault visibility', () => {
  const makeService = (cashVaultAccessResult = {
    allowed: false,
    reason: 'cash_vault_view_permission_required',
  }) => {
    const builder = {
      modify: jest.fn(),
      where: jest.fn(),
    };
    const dynamicList = {
      buildQuery: () => jest.fn(),
      getResponseMeta: jest.fn().mockReturnValue({}),
    };
    const dynamicListService = {
      parseStringifiedFilter: jest.fn((filter) => filter),
      dynamicList: jest.fn().mockResolvedValue(dynamicList),
    };
    const transformerService = {
      transform: jest.fn().mockResolvedValue([]),
    };
    const accountRepository = {
      getDependencyGraph: jest.fn().mockResolvedValue({}),
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
      canViewCashVault: jest.fn().mockReturnValue(cashVaultAccessResult),
    };
    const service = new (GetAccountsService as any)(
      dynamicListService,
      transformerService,
      accountRepository,
      accountModel,
      cashVaultAccess,
    );

    return { service, builder };
  };

  it('filters Cash Vault accounts from ordinary account lists without full access', async () => {
    const { service, builder } = makeService();

    await service.getAccountsList({
      cashVaultAccess: { tenantId: 1, requestedTenantId: 1 },
    });

    expect(builder.where).toHaveBeenCalledWith('is_cash_vault', false);
  });
});
