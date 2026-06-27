import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class CashVaultDesignatedAdmin extends TenantBaseModel {
  public id!: number;
  public userId!: number;
  public designatedByUserId!: number;
  public createdAt!: Date | string;
  public updatedAt!: Date | string;

  static get tableName() {
    return 'cash_vault_designated_admins';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'designatedByUserId'],
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        designatedByUserId: { type: 'integer' },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }
}
