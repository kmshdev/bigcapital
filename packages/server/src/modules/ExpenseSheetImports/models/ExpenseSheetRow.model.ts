import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class ExpenseSheetRow extends TenantBaseModel {
  public id!: number;
  public importId!: number;
  public rowNumber!: number;
  public values!: Record<string, unknown>;
  public validationErrors!: Record<string, string[]> | null;
  public committedTransactionId!: number | null;
  public createdAt!: Date | string;
  public updatedAt!: Date | string;

  static get tableName() {
    return 'expense_sheet_rows';
  }

  static get jsonAttributes() {
    return ['values', 'validationErrors'];
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['importId', 'rowNumber', 'values'],
      properties: {
        id: { type: 'integer' },
        importId: { type: 'integer' },
        rowNumber: { type: 'integer' },
        values: { type: 'object' },
        validationErrors: { type: ['object', 'null'] },
        committedTransactionId: { type: ['integer', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }
}
