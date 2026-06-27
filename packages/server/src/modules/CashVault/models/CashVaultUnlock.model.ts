import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class CashVaultUnlock extends TenantBaseModel {
  public id!: number;
  public userId!: number;
  public grantedByUserId!: number;
  public expiresAt!: Date | string;
  public revokedAt!: Date | string | null;
  public revokedByUserId!: number | null;
  public createdAt!: Date | string;
  public updatedAt!: Date | string;

  static get tableName() {
    return 'cash_vault_unlocks';
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['userId', 'grantedByUserId', 'expiresAt'],
      properties: {
        id: { type: 'integer' },
        userId: { type: 'integer' },
        grantedByUserId: { type: 'integer' },
        expiresAt: { type: 'string' },
        revokedAt: { type: ['string', 'null'] },
        revokedByUserId: { type: ['integer', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }
}
