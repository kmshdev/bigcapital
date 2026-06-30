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
    purpose: 'entry' | 'manage';
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

  it('does not let owner, member, or general admin status bypass the unlock challenge', () => {
    const cases = [
      access({ isOwner: true }),
      access({ isGeneralAdmin: true }),
      access({ permissions: ['CashVault.Entry'] }),
      access({ permissions: ['CashVault.Manage', 'CashVault.View'] }),
    ];

    for (const candidate of cases) {
      expect((service as any).canCreateCashVaultEntry(candidate, now)).toEqual({
        allowed: false,
        reason: 'cash_vault_entry_permission_required',
      });
      expect((service as any).canViewCashVault(candidate, now)).toEqual({
        allowed: false,
        reason: 'cash_vault_view_permission_required',
      });
      expect((service as any).canManageCashVault(candidate, now)).toEqual({
        allowed: false,
        reason: 'cash_vault_manage_permission_required',
      });
    }
  });

  it('enforces unlock invariants across purpose, expiry, revocation, tenant, and designated-admin state', () => {
    const purposes = ['entry', 'manage'] as const;
    const expiresAtValues = [
      new Date('2026-06-27T09:59:59.000Z'),
      new Date('2026-06-27T10:15:00.000Z'),
    ];
    const revokedAtValues = [
      null,
      new Date('2026-06-27T10:01:00.000Z'),
    ];
    const tenantPairs = [
      { tenantId: 1, requestedTenantId: 1 },
      { tenantId: 1, requestedTenantId: 2 },
    ];
    const designatedValues = [false, true];

    for (const purpose of purposes) {
      for (const expiresAt of expiresAtValues) {
        for (const revokedAt of revokedAtValues) {
          for (const tenantPair of tenantPairs) {
            for (const isDesignatedAdmin of designatedValues) {
              const candidate = access({
                ...tenantPair,
                activeUnlock: {
                  tenantId: tenantPair.tenantId,
                  expiresAt,
                  revokedAt,
                  isDesignatedAdmin,
                  purpose,
                },
              });
              const active =
                tenantPair.tenantId === tenantPair.requestedTenantId &&
                !revokedAt &&
                expiresAt.getTime() > now.getTime();
              const canEntry = active && (purpose === 'entry' || purpose === 'manage');
              const canManage =
                active && purpose === 'manage' && isDesignatedAdmin;

              expect((service as any).canCreateCashVaultEntry(candidate, now).allowed).toBe(canEntry);
              expect((service as any).canViewCashVault(candidate, now).allowed).toBe(canManage);
              expect((service as any).canManageCashVault(candidate, now).allowed).toBe(canManage);
            }
          }
        }
      }
    }
  });
});
