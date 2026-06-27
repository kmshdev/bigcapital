import { TenantBaseModel } from '@/modules/System/models/TenantBaseModel';

export class ExpenseSheetImport extends TenantBaseModel {
  public id!: number;
  public uploadedByUserId!: number;
  public status!: string;
  public currencyCode!: 'INR';
  public sourceFilename!: string;
  public mapping!: Record<string, string> | null;
  public createdAt!: Date | string;
  public updatedAt!: Date | string;

  static get tableName() {
    return 'expense_sheet_imports';
  }

  static get jsonAttributes() {
    return ['mapping'];
  }

  get timestamps() {
    return ['createdAt', 'updatedAt'];
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: [
        'uploadedByUserId',
        'status',
        'currencyCode',
        'sourceFilename',
      ],
      properties: {
        id: { type: 'integer' },
        uploadedByUserId: { type: 'integer' },
        status: { type: 'string' },
        currencyCode: { type: 'string', enum: ['INR'] },
        sourceFilename: { type: 'string' },
        mapping: { type: ['object', 'null'] },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    };
  }
}
