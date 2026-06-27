import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { ABILITIES_CACHE, getAbilityForRole } from './TenantAbilities';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { TenantUser } from '../Tenancy/TenancyModels/models/TenantUser.model';
import { UserTenant } from '../System/models/UserTenant.model';
import { TenantModel } from '../System/models/TenantModel';
import { CashVaultAccessService } from '../CashVault/CashVaultAccess.service';

/**
 * Authorization guard for checking user abilities
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly clsService: ClsService,

    @Inject(TenantUser.name)
    private readonly tenantUserModel: TenantModelProxy<typeof TenantUser>,

    @Inject(UserTenant.name)
    private readonly userTenantModel: typeof UserTenant,

    @Inject(TenantModel.name)
    private readonly tenantModel: typeof TenantModel,

    private readonly cashVaultAccess?: CashVaultAccessService,
  ) {}

  /**
   * Checks if the user has the required abilities to access the route
   * @param context - The execution context
   * @returns A boolean indicating if the user can access the route
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const { user } = request as any;
    const userId = this.clsService.get('userId');
    const organizationId = this.clsService.get('organizationId');
    const cacheKey = `${userId}:${organizationId || 'tenant-agnostic'}`;

    if (!this.cashVaultAccess && ABILITIES_CACHE.has(cacheKey)) {
      (request as any).ability = ABILITIES_CACHE.get(cacheKey);
    } else {
      const ability = await this.getAbilityForUser();
      (request as any).ability = ability;
      ABILITIES_CACHE.set(cacheKey, ability);
    }
    return true;
  }

  async getAbilityForUser() {
    const userId = this.clsService.get('userId');
    const organizationId = this.clsService.get('organizationId');
    const tenantUser = await this.tenantUserModel()
      .query()
      .findOne('systemUserId', userId)
      .withGraphFetched('role.permissions');
    const membershipRole = await this.getMembershipRole(userId, organizationId);
    const cashVaultAccess = await this.cashVaultAccess?.getCurrentUserAccess();

    return getAbilityForRole(
      tenantUser.role,
      membershipRole,
      Boolean(cashVaultAccess?.activeUnlock),
    );
  }

  private async getMembershipRole(userId: number, organizationId?: string) {
    if (!organizationId) {
      return undefined;
    }
    const tenant = await this.tenantModel.query().findOne({ organizationId });
    if (!tenant) {
      return undefined;
    }
    const membership = await this.userTenantModel
      .query()
      .findOne({ userId, tenantId: tenant.id });

    return membership?.role;
  }
}
