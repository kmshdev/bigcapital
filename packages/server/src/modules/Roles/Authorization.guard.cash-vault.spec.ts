import { AbilitySubject, CashVaultAction } from './Roles.types';
import { AuthorizationGuard } from './Authorization.guard';
import { Test } from '@nestjs/testing';
import { ClsService } from 'nestjs-cls';
import { TenantUser } from '../Tenancy/TenancyModels/models/TenantUser.model';
import { UserTenant } from '../System/models/UserTenant.model';
import { TenantModel } from '../System/models/TenantModel';

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
  it('can be resolved by modules that do not provide CashVaultAccessService locally', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthorizationGuard,
        { provide: ClsService, useValue: { get: jest.fn() } },
        { provide: TenantUser.name, useValue: makeTenantUserProxy() },
        { provide: UserTenant.name, useValue: makeUserTenantModel(null) },
        { provide: TenantModel.name, useValue: makeTenantModel(null) },
      ],
    }).compile();

    expect(moduleRef.get(AuthorizationGuard)).toBeInstanceOf(
      AuthorizationGuard,
    );
  });

  it('does not grant owner memberships Cash Vault abilities until a manage unlock exists', async () => {
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
      { getCurrentUserAccess: jest.fn().mockResolvedValue({}) } as any,
    );

    const ability = await guard.getAbilityForUser();

    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(false);
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(false);
    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(false);
  });

  it('does not grant accountant memberships Cash Vault entry until an entry unlock exists', async () => {
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
      { getCurrentUserAccess: jest.fn().mockResolvedValue({}) } as any,
    );

    const ability = await guard.getAbilityForUser();

    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(false);
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(false);
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(false);
  });

  it('grants entry-only ability for an active entry unlock', async () => {
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
      {
        getCurrentUserAccess: jest.fn().mockResolvedValue({
          activeUnlock: { purpose: 'entry' },
        }),
      } as any,
    );

    const ability = await guard.getAbilityForUser();

    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(true);
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(false);
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(false);
  });

  it('grants full ability for an active manage unlock', async () => {
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
      {
        getCurrentUserAccess: jest.fn().mockResolvedValue({
          activeUnlock: { purpose: 'manage' },
        }),
      } as any,
    );

    const ability = await guard.getAbilityForUser();

    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(true);
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(true);
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(true);
  });
});
