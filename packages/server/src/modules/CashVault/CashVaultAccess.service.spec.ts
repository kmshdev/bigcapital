import { CashVaultAccessService } from './CashVaultAccess.service';

type CashVaultUserAccess = {
  tenantId: number;
  requestedTenantId: number;
  isOwner: boolean;
  isGeneralAdmin: boolean;
  permissions: string[];
  activeUnlock?: {
    tenantId: number;
    expiresAt: Date;
    revokedAt?: Date | null;
    isDesignatedAdmin: boolean;
  };
};

describe('CashVaultAccessService', () => {
  let service: CashVaultAccessService;
  const now = new Date('2026-06-27T10:00:00.000Z');

  beforeEach(() => {
    service = new CashVaultAccessService();
  });

  const access = (
    overrides: Partial<CashVaultUserAccess> = {},
  ): CashVaultUserAccess => ({
    tenantId: 1,
    requestedTenantId: 1,
    isOwner: false,
    isGeneralAdmin: false,
    permissions: [],
    ...overrides,
  });

  it('allows owner admins to manage Cash Vault for the selected tenant', () => {
    const result = (service as any).canManageCashVault(
      access({ isOwner: true, isGeneralAdmin: true }),
      now,
    );

    expect(result).toEqual({ allowed: true });
  });

  it('does not let normal admin access imply Cash Vault management', () => {
    const result = (service as any).canManageCashVault(
      access({ isGeneralAdmin: true }),
      now,
    );

    expect(result).toEqual({
      allowed: false,
      reason: 'cash_vault_manage_permission_required',
    });
  });

  it('allows accountant entry permission without granting full visibility', () => {
    const entryResult = (service as any).canCreateCashVaultEntry(
      access({
        isGeneralAdmin: true,
        permissions: ['CashVault.Entry'],
      }),
      now,
    );
    const viewResult = (service as any).canViewCashVault(
      access({
        isGeneralAdmin: true,
        permissions: ['CashVault.Entry'],
      }),
      now,
    );

    expect(entryResult).toEqual({ allowed: true });
    expect(viewResult).toEqual({
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    });
  });

  it('allows active designated-admin unlocks only inside the selected tenant', () => {
    const result = (service as any).canViewCashVault(
      access({
        requestedTenantId: 1,
        activeUnlock: {
          tenantId: 1,
          expiresAt: new Date('2026-06-27T10:15:00.000Z'),
          revokedAt: null,
          isDesignatedAdmin: true,
        },
      }),
      now,
    );
    const crossTenantResult = (service as any).canViewCashVault(
      access({
        requestedTenantId: 2,
        activeUnlock: {
          tenantId: 1,
          expiresAt: new Date('2026-06-27T10:15:00.000Z'),
          revokedAt: null,
          isDesignatedAdmin: true,
        },
      }),
      now,
    );

    expect(result).toEqual({ allowed: true });
    expect(crossTenantResult).toEqual({
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    });
  });

  it('rejects expired, revoked, and non-designated unlocks', () => {
    const expiredResult = (service as any).canViewCashVault(
      access({
        activeUnlock: {
          tenantId: 1,
          expiresAt: new Date('2026-06-27T09:59:59.000Z'),
          revokedAt: null,
          isDesignatedAdmin: true,
        },
      }),
      now,
    );
    const revokedResult = (service as any).canViewCashVault(
      access({
        activeUnlock: {
          tenantId: 1,
          expiresAt: new Date('2026-06-27T10:15:00.000Z'),
          revokedAt: new Date('2026-06-27T10:01:00.000Z'),
          isDesignatedAdmin: true,
        },
      }),
      now,
    );
    const nonDesignatedResult = (service as any).canViewCashVault(
      access({
        activeUnlock: {
          tenantId: 1,
          expiresAt: new Date('2026-06-27T10:15:00.000Z'),
          revokedAt: null,
          isDesignatedAdmin: false,
        },
      }),
      now,
    );

    expect(expiredResult).toEqual({
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    });
    expect(revokedResult).toEqual({
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    });
    expect(nonDesignatedResult).toEqual({
      allowed: false,
      reason: 'cash_vault_view_permission_required',
    });
  });
});
