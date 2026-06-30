import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CashVaultDesignatedAdmin } from '../models/CashVaultDesignatedAdmin.model';
import { CashVaultUnlock } from '../models/CashVaultUnlock.model';

@Injectable()
export class ManageCashVaultUnlockService {
  constructor(
    @Inject(CashVaultDesignatedAdmin.name)
    private readonly designatedAdminModel: TenantModelProxy<
      typeof CashVaultDesignatedAdmin
    >,
    @Inject(CashVaultUnlock.name)
    private readonly unlockModel: TenantModelProxy<typeof CashVaultUnlock>,
  ) {}

  public async listDesignatedAdmins() {
    return this.designatedAdminModel().query();
  }

  public async isDesignatedAdmin(userId: number) {
    const designatedAdmin = await this.designatedAdminModel()
      .query()
      .findOne({ userId });

    return Boolean(designatedAdmin);
  }

  public async replaceDesignatedAdmins({
    userIds,
    designatedByUserId,
  }: {
    userIds: number[];
    designatedByUserId: number;
  }) {
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length > 2) {
      throw new Error('cash_vault_designated_admin_limit_exceeded');
    }
    await this.designatedAdminModel().query().delete();
    if (uniqueUserIds.length === 0) {
      return [];
    }
    return this.designatedAdminModel()
      .query()
      .insert(
        uniqueUserIds.map((userId) => ({
          userId,
          designatedByUserId,
        })),
      );
  }

  public async grantUnlock({
    userId,
    grantedByUserId,
    expiresAt,
    purpose = 'manage',
    requireDesignatedAdmin = true,
  }: {
    userId: number;
    grantedByUserId: number;
    expiresAt: string;
    purpose?: 'entry' | 'manage';
    requireDesignatedAdmin?: boolean;
  }) {
    if (requireDesignatedAdmin) {
      const designatedAdmin = await this.designatedAdminModel()
        .query()
        .findOne({ userId });
      if (!designatedAdmin) {
        throw new Error('cash_vault_unlock_user_not_designated');
      }
    }
    return this.unlockModel().query().insert({
      userId,
      grantedByUserId,
      purpose,
      expiresAt: this.toMysqlDateTime(expiresAt),
      revokedAt: null,
      revokedByUserId: null,
    });
  }

  public revokeUnlock(unlockId: number, revokedByUserId: number) {
    return this.unlockModel()
      .query()
      .patchAndFetchById(unlockId, {
        revokedAt: new Date(),
        revokedByUserId,
      });
  }

  private toMysqlDateTime(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }
}
