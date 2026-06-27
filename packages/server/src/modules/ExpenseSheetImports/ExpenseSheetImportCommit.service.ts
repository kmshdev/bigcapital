import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpenseSheetImport } from './models/ExpenseSheetImport.model';
import { ExpenseSheetRow } from './models/ExpenseSheetRow.model';
import { getExpenseSheetColumn } from './ExpenseSheetSchema';

type PreviewRow = {
  rowNumber: number;
  values: Record<string, unknown>;
  validationErrors: Record<string, string[]> | null;
};

type PreviewRowsOptions = {
  defaultExpenseAccountName?: string;
  defaultExpenseAccountSlug?: string;
};

const moneyPattern = /^-?\d+(\.\d{1,2})?$/;

@Injectable()
export class ExpenseSheetImportCommitService {
  constructor(
    @Inject(ExpenseSheetImport.name)
    private readonly importModel: TenantModelProxy<typeof ExpenseSheetImport>,
    @Inject(ExpenseSheetRow.name)
    private readonly rowModel: TenantModelProxy<typeof ExpenseSheetRow>,
  ) {}

  public previewRows(
    rows: Record<string, unknown>[],
    options: PreviewRowsOptions = {},
  ): PreviewRow[] {
    const seenBillNos = new Set<string>();
    return rows.map((row, index) => {
      const values: Record<string, unknown> = {
        currencyCode: 'INR',
        defaultExpenseAccountName: options.defaultExpenseAccountName || null,
        defaultExpenseAccountSlug: options.defaultExpenseAccountSlug || null,
      };
      const validationErrors: Record<string, string[]> = {};

      Object.entries(row).forEach(([header, value]) => {
        const column = getExpenseSheetColumn(header);
        if (!column) {
          validationErrors[header.trim()] = ['unsupported_column'];
          return;
        }
        if (value === null || value === undefined || value === '') {
          values[column.field] = null;
          return;
        }
        if (column.type === 'money') {
          const text = String(value).trim();
          if (!moneyPattern.test(text)) {
            validationErrors[column.field] = ['invalid_inr_amount'];
          } else {
            values[column.field] = Number(text);
          }
          return;
        }
        if (column.type === 'date') {
          const date = new Date(String(value));
          if (Number.isNaN(date.getTime())) {
            validationErrors[column.field] = ['invalid_date'];
          } else {
            values[column.field] = String(value);
          }
          return;
        }
        values[column.field] = String(value).trim();
      });

      const billNo = values.billNo as string | undefined;
      if (billNo) {
        if (seenBillNos.has(billNo)) {
          validationErrors.billNo = ['duplicate_bill_reference'];
        }
        seenBillNos.add(billNo);
      }

      return {
        rowNumber: index + 1,
        values,
        validationErrors:
          Object.keys(validationErrors).length > 0 ? validationErrors : null,
      };
    });
  }

  public async commitRows(importId: number, rows: PreviewRow[]) {
    const validRows = rows.filter((row) => !row.validationErrors);
    if (validRows.length > 0) {
      await this.rowModel()
        .query()
        .insert(
          validRows.map((row) => ({
            importId,
            rowNumber: row.rowNumber,
            values: row.values,
            validationErrors: null,
            committedTransactionId: null,
          })),
        );
    }
    return {
      committed: validRows.length,
      rejected: rows.length - validRows.length,
    };
  }

  public async upload(sourceFilename: string, uploadedByUserId?: number) {
    return this.importModel().query().insert({
      uploadedByUserId: uploadedByUserId || 0,
      status: 'uploaded',
      currencyCode: 'INR',
      sourceFilename,
      mapping: null,
    });
  }
}
