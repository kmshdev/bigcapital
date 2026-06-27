import { AbilitySubject, CashVaultAction } from './Roles.types';
import { AuthorizationGuard } from './Authorization.guard';

const makeTenantUserModel = () => ({
  query: jest.fn(() => ({
    findOne: jest.fn(() => ({
      withGraphFetched: jest.fn().mockResolvedValue({
        role: { slug: 'admin', permissions: [] },
      }),
    })),
  })),
});

const makeTenantUserProxy = () => jest.fn(() => makeTenantUserModel());

const makeTenantModel = (tenant: any) => ({
  query: jest.fn(() => ({
    findOne: jest.fn().mockResolvedValue(tenant),
  })),
});

const makeUserTenantModel = (membership: any) => ({
  query: jest.fn(() => ({
    findOne: jest.fn().mockResolvedValue(membership),
  })),
});

describe('AuthorizationGuard Cash Vault membership abilities', () => {
  it('grants owner memberships full Cash Vault abilities for the selected organization', async () => {
    const cls = {
      get: jest.fn((key) =>
        key === 'userId' ? 10 : 'risingstone_infra_pvt_ltd',
      ),
    } as any;
    const guard = new AuthorizationGuard(
      cls,
      makeTenantUserProxy() as any,
      makeUserTenantModel({ role: 'owner' }) as any,
      makeTenantModel({ id: 1 }) as any,
    );

    const ability = await guard.getAbilityForUser();

    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      true,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      true,
    );
    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      true,
    );
  });

  it('grants accountant memberships Cash Vault entry only', async () => {
    const cls = {
      get: jest.fn((key) =>
        key === 'userId' ? 30 : 'risingstone_infra_pvt_ltd',
      ),
    } as any;
    const guard = new AuthorizationGuard(
      cls,
      makeTenantUserProxy() as any,
      makeUserTenantModel({ role: 'member' }) as any,
      makeTenantModel({ id: 1 }) as any,
    );

    const ability = await guard.getAbilityForUser();

    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      true,
    );
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      false,
    );
  });
});
