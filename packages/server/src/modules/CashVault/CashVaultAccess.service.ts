import { Injectable } from '@nestjs/common';

type CashVaultAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

type CashVaultUnlockAccess = {
  tenantId: number;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
  isDesignatedAdmin: boolean;
};

type CashVaultUserAccess = {
  tenantId: number;
  requestedTenantId: number;
  isOwner: boolean;
  isGeneralAdmin: boolean;
  permissions: string[];
  activeUnlock?: CashVaultUnlockAccess;
};

@Injectable()
export class CashVaultAccessService {
  public canManageCashVault(
    access: CashVaultUserAccess,
    now = new Date(),
  ): CashVaultAccessDecision {
    if (!this.isSelectedTenant(access)) {
      return this.deny('cash_vault_manage_permission_required');
    }
    if (access.isOwner || access.permissions.includes('CashVault.Manage')) {
      return { allowed: true };
    }
    if (this.hasActiveUnlock(access, now)) {
      return { allowed: true };
    }
    return this.deny('cash_vault_manage_permission_required');
  }

  public canCreateCashVaultEntry(
    access: CashVaultUserAccess,
    now = new Date(),
  ): CashVaultAccessDecision {
    if (!this.isSelectedTenant(access)) {
      return this.deny('cash_vault_entry_permission_required');
    }
    if (
      access.permissions.includes('CashVault.Entry') ||
      this.hasActiveUnlock(access, now)
    ) {
      return { allowed: true };
    }
    return this.deny('cash_vault_entry_permission_required');
  }

  public canViewCashVault(
    access: CashVaultUserAccess,
    now = new Date(),
  ): CashVaultAccessDecision {
    if (!this.isSelectedTenant(access)) {
      return this.deny('cash_vault_view_permission_required');
    }
    if (
      access.permissions.includes('CashVault.View') ||
      this.hasActiveUnlock(access, now)
    ) {
      return { allowed: true };
    }
    return this.deny('cash_vault_view_permission_required');
  }

  private isSelectedTenant(access: CashVaultUserAccess) {
    return access.tenantId === access.requestedTenantId;
  }

  private hasActiveUnlock(access: CashVaultUserAccess, now: Date) {
    const unlock = access.activeUnlock;
    if (!unlock) {
      return false;
    }
    if (!unlock.isDesignatedAdmin) {
      return false;
    }
    if (unlock.tenantId !== access.requestedTenantId) {
      return false;
    }
    if (unlock.revokedAt) {
      return false;
    }
    return new Date(unlock.expiresAt).getTime() > now.getTime();
  }

  private deny(reason: string): CashVaultAccessDecision {
    return { allowed: false, reason };
  }
}
