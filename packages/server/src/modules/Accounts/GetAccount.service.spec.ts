import { GetAccount } from './GetAccount.service';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Cash Vault direct account access', () => {
  const deniedAccess = {
    canViewCashVault: jest.fn().mockReturnValue({
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    }),
  };

  it('denies direct account detail reads for hidden Cash Vault accounts', async () => {
    const account = { id: 22, isCashVault: true };
    const accountModel = jest.fn(() => ({
      query: () => ({
        findById: () => ({
          withGraphFetched: () => ({
            throwIfNotFound: () => Promise.resolve(account),
          }),
        }),
      }),
    }));
    const service = new (GetAccount as any)(
      accountModel,
      { getDependencyGraph: jest.fn() },
      { transform: jest.fn() },
      { emitAsync: jest.fn() },
      deniedAccess,
    );

    await expect(
      service.getAccount(22, {
        cashVaultAccess: { tenantId: 1, requestedTenantId: 1 },
      }),
    ).rejects.toThrow('cash_vault_view_permission_required');
  });

  it('adds an explicit Cash Vault guard to account transaction history', () => {
    const source = readFileSync(
      join(__dirname, 'GetAccountTransactions.service.ts'),
      'utf8',
    );

    expect(source).toContain('cashVaultAccess');
    expect(source).toContain('isCashVault');
  });
});
