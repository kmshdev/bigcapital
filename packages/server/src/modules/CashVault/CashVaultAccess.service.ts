import { Inject, Injectable, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { TenantModel } from '../System/models/TenantModel';
import { UserTenant, UserTenantRole } from '../System/models/UserTenant.model';
import { CashVaultDesignatedAdmin } from './models/CashVaultDesignatedAdmin.model';
import { CashVaultUnlock } from './models/CashVaultUnlock.model';

type CashVaultAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: string };

type CashVaultUnlockAccess = {
  tenantId: number;
  expiresAt: Date | string;
  revokedAt?: Date | string | null;
  isDesignatedAdmin: boolean;
  purpose: 'entry' | 'manage';
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
  constructor(
    @Optional()
    private readonly cls?: ClsService,

    @Optional()
    @Inject(TenantModel.name)
    private readonly tenantModel?: typeof TenantModel,

    @Optional()
    @Inject(UserTenant.name)
    private readonly userTenantModel?: typeof UserTenant,

    @Optional()
    @Inject(CashVaultDesignatedAdmin.name)
    private readonly designatedAdminModel?: TenantModelProxy<
      typeof CashVaultDesignatedAdmin
    >,

    @Optional()
    @Inject(CashVaultUnlock.name)
    private readonly unlockModel?: TenantModelProxy<typeof CashVaultUnlock>,
  ) {}

  public async getCurrentUserAccess(
    now = new Date(),
  ): Promise<CashVaultUserAccess> {
    const userId = this.cls?.get('userId');
    const organizationId = this.cls?.get('organizationId');

    if (
      !userId ||
      !organizationId ||
      !this.tenantModel ||
      !this.userTenantModel
    ) {
      return this.emptyAccess();
    }
    const tenant = await this.tenantModel.query().findOne({ organizationId });
    if (!tenant) {
      return this.emptyAccess();
    }
    const membership = await this.userTenantModel
      .query()
      .findOne({ userId, tenantId: tenant.id });
    const requestedScope = this.cls?.get('cashVaultScope');
    const activeUnlock = await this.getActiveUnlock(userId, tenant.id, now);

    return {
      tenantId: tenant.id,
      requestedTenantId: tenant.id,
      isOwner: membership?.role === 'owner',
      isGeneralAdmin: false,
      permissions: this.permissionsForMembership(membership?.role),
      activeUnlock: this.isUnlockInRequestedScope(activeUnlock, requestedScope)
        ? activeUnlock
        : undefined,
    };
  }

  public canManageCashVault(
    access: CashVaultUserAccess,
    now = new Date(),
  ): CashVaultAccessDecision {
    if (!this.isSelectedTenant(access)) {
      return this.deny('cash_vault_manage_permission_required');
    }
    if (this.hasActiveUnlock(access, now, 'manage', true)) {
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
    if (this.hasActiveUnlock(access, now, 'entry')) {
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
    if (this.hasActiveUnlock(access, now, 'manage', true)) {
      return { allowed: true };
    }
    return this.deny('cash_vault_view_permission_required');
  }

  private isSelectedTenant(access: CashVaultUserAccess) {
    return access.tenantId === access.requestedTenantId;
  }

  private hasActiveUnlock(
    access: CashVaultUserAccess,
    now: Date,
    purpose: 'entry' | 'manage',
    requireDesignatedAdmin = false,
  ) {
    const unlock = access.activeUnlock;
    if (!unlock) {
      return false;
    }
    if (requireDesignatedAdmin && !unlock.isDesignatedAdmin) {
      return false;
    }
    const purposeAllowed =
      unlock.purpose === purpose ||
      (purpose === 'entry' && unlock.purpose === 'manage');
    if (!purposeAllowed) {
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

  private emptyAccess(): CashVaultUserAccess {
    return {
      tenantId: 0,
      requestedTenantId: -1,
      isOwner: false,
      isGeneralAdmin: false,
      permissions: [],
    };
  }

  private permissionsForMembership(role?: UserTenantRole) {
    switch (role) {
      case 'owner':
      case 'member':
        return [];
      default:
        return [];
    }
  }

  private async getActiveUnlock(
    userId: number,
    tenantId: number,
    now: Date,
  ): Promise<CashVaultUnlockAccess | undefined> {
    if (!this.unlockModel || !this.designatedAdminModel) {
      return undefined;
    }
    const unlock = await this.unlockModel()
      .query()
      .where({ userId })
      .whereNull('revokedAt')
      .where('expiresAt', '>', now)
      .orderBy('expiresAt', 'desc')
      .first();

    if (!unlock) {
      return undefined;
    }
    const designatedAdmin = await this.designatedAdminModel()
      .query()
      .findOne({ userId });

    return {
      tenantId,
      expiresAt: unlock.expiresAt,
      revokedAt: unlock.revokedAt,
      isDesignatedAdmin: Boolean(designatedAdmin),
      purpose: unlock.purpose,
    };
  }

  private isUnlockInRequestedScope(
    unlock: CashVaultUnlockAccess | undefined,
    requestedScope?: 'entry' | 'manage',
  ) {
    if (!unlock || !requestedScope) {
      return false;
    }
    if (unlock.purpose === 'manage') {
      return requestedScope === 'manage' || requestedScope === 'entry';
    }
    return requestedScope === 'entry';
  }
}
