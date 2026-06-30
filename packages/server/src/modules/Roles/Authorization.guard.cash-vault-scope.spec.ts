import { AuthorizationGuard } from './Authorization.guard';
import { CashVaultAction, AbilitySubject } from './Roles.types';

describe('AuthorizationGuard Cash Vault scoped unlocks', () => {
  const makeGuard = (cashVaultScope?: string) => {
    const request: any = {
      headers: cashVaultScope ? { 'x-cash-vault-scope': cashVaultScope } : {},
    };
    const cls = {
      get: jest.fn((key) => {
        if (key === 'userId') return 10;
        if (key === 'organizationId') return 'org_1';
        return undefined;
      }),
      set: jest.fn(),
    };
    const tenantUserModel = jest.fn(() => ({
      query: () => ({
        findOne: jest.fn().mockReturnThis(),
        withGraphFetched: jest.fn().mockResolvedValue({
          role: { slug: 'admin', permissions: [] },
        }),
      }),
    }));
    const tenantModel = {
      query: () => ({
        findOne: jest.fn().mockResolvedValue({ id: 1 }),
      }),
    };
    const userTenantModel = {
      query: () => ({
        findOne: jest.fn().mockResolvedValue({ role: 'member' }),
      }),
    };
    const cashVaultAccess = {
      getCurrentUserAccess: jest.fn().mockResolvedValue({
        tenantId: 1,
        requestedTenantId: 1,
        activeUnlock: {
          purpose: 'manage',
          tenantId: 1,
          expiresAt: new Date(Date.now() + 10000).toISOString(),
          isDesignatedAdmin: true,
        },
      }),
    };
    const guard = new (AuthorizationGuard as any)(
      cls,
      tenantUserModel,
      userTenantModel,
      tenantModel,
      cashVaultAccess,
    );
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    return { guard, request, context, cls };
  };

  it('does not grant Cash Vault abilities to normal app requests with an active unlock', async () => {
    const { guard, request, context } = makeGuard();

    await guard.canActivate(context as any);

    expect(
      request.ability.can(CashVaultAction.View, AbilitySubject.CashVault),
    ).toBe(false);
  });

  it('grants Cash Vault abilities only when the request declares vault scope', async () => {
    const { guard, request, context, cls } = makeGuard('manage');

    await guard.canActivate(context as any);

    expect(cls.set).toHaveBeenCalledWith('cashVaultScope', 'manage');
    expect(
      request.ability.can(CashVaultAction.View, AbilitySubject.CashVault),
    ).toBe(true);
  });
});
