import { Inject, Injectable, Optional } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ExpenseSheetImport } from './models/ExpenseSheetImport.model';
import { ExpenseSheetRow } from './models/ExpenseSheetRow.model';
import { getExpenseSheetColumn } from './ExpenseSheetSchema';
import { Account } from '@/modules/Accounts/models/Account.model';
import { CreateExpense } from '@/modules/Expenses/commands/CreateExpense.service';

type PreviewRow = {
  rowNumber: number;
  values: Record<string, unknown>;
  validationErrors: Record<string, string[]> | null;
};

type PreviewRowsOptions = {
  defaultExpenseAccountName?: string;
  defaultExpenseAccountSlug?: string;
};

type CommittedExpenseSheetRow = {
  id: number;
  row: PreviewRow;
};

const moneyPattern = /^-?\d+(\.\d{1,2})?$/;

const valueKeyAliases = {
  bill_no: 'billNo',
  bill_date: 'billDate',
  item_description: 'itemDescription',
  basic_value: 'basicValue',
  freight_other: 'freightOther',
  total_bill_value: 'totalBillValue',
  gst_on_r_c_m: 'gstOnRCM',
  gst_on_rcm: 'gstOnRCM',
  tds_deducted: 'tdsDeducted',
  late_fee_and_interest: 'lateFeeAndInterest',
  payment_date: 'paymentDate',
  mode_of_payment: 'modeOfPayment',
  balance_payable: 'balancePayable',
  currency_code: 'currencyCode',
  default_expense_account_name: 'defaultExpenseAccountName',
  default_expense_account_slug: 'defaultExpenseAccountSlug',
  vendor_name: 'vendorName',
} as const;

const normalizeValues = (values: Record<string, unknown> = {}) =>
  Object.entries(values).reduce<Record<string, unknown>>(
    (normalized, [key, value]) => {
      normalized[valueKeyAliases[key] || key] = value;
      return normalized;
    },
    {},
  );

@Injectable()
export class ExpenseSheetImportCommitService {
  constructor(
    @Inject(ExpenseSheetImport.name)
    private readonly importModel: TenantModelProxy<typeof ExpenseSheetImport>,
    @Inject(ExpenseSheetRow.name)
    private readonly rowModel: TenantModelProxy<typeof ExpenseSheetRow>,
    @Optional()
    @Inject(Account.name)
    private readonly accountModel?: TenantModelProxy<typeof Account>,
    @Optional()
    private readonly createExpense?: CreateExpense,
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
    await this.claimImportForCommit(importId);

    try {
      const normalizedRows = rows.map((row, index) =>
        this.normalizePreviewRow(row, index),
      );
      const validRows = normalizedRows.filter((row) => !row.validationErrors);
      const committedRows = await this.insertCommittedRows(importId, validRows);
      const postedExpenses = await this.postExpenses(committedRows);

      await this.importModel().query().patchAndFetchById(importId, {
        status: 'committed',
      });

      const result: Record<string, number> = {
        committed: committedRows.length,
        rejected: normalizedRows.length - validRows.length,
      };
      if (this.accountModel && this.createExpense) {
        result.postedExpenses = postedExpenses;
      }
      return result;
    } catch (error) {
      try {
        await this.importModel().query().patchAndFetchById(importId, {
          status: 'failed',
        });
      } catch {
        // Preserve the original commit failure.
      }
      throw error;
    }
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

  private async claimImportForCommit(importId: number) {
    const claimed = await this.importModel()
      .query()
      .where({ id: importId })
      .whereNotIn('status', ['committing', 'committed', 'failed'])
      .patch({ status: 'committing' });

    if (claimed > 0) {
      return;
    }

    const expenseSheetImport = await this.importModel().query().findById(importId);
    if (!expenseSheetImport) {
      throw new Error('expense_sheet_import_not_found');
    }
    throw new Error('expense_sheet_import_already_committed');
  }

  private async insertCommittedRows(
    importId: number,
    rows: PreviewRow[],
  ): Promise<CommittedExpenseSheetRow[]> {
    const committedRows: CommittedExpenseSheetRow[] = [];

    for (const row of rows) {
      const insertedRow = await this.rowModel()
        .query()
        .insert({
          importId,
          rowNumber: row.rowNumber,
          values: row.values,
          validationErrors: null,
          committedTransactionId: null,
        });

      committedRows.push({
        id: insertedRow.id,
        row,
      });
    }

    return committedRows;
  }

  private async postExpenses(rows: CommittedExpenseSheetRow[]) {
    if (!this.accountModel || !this.createExpense) {
      return 0;
    }
    let posted = 0;
    for (const row of rows) {
      const dto = await this.buildExpenseDto(row.row);
      if (!dto) {
        continue;
      }
      const expense = await this.createExpense.newExpense(dto as any);
      await this.rowModel().query().patchAndFetchById(row.id, {
        committedTransactionId: expense.id,
      });
      posted += 1;
    }
    return posted;
  }

  private async buildExpenseDto(row: PreviewRow) {
    const values = row.values;
    const amount = this.getTransactionAmount(values);
    if (!amount) {
      return null;
    }
    const expenseAccount = await this.accountModel()
      .query()
      .findOne({ slug: values.defaultExpenseAccountSlug });
    const paymentAccount = await this.resolvePaymentAccount();
    if (!expenseAccount || !paymentAccount) {
      return null;
    }
    return {
      referenceNo: (values.billNo as string) || undefined,
      paymentDate:
        (values.paymentDate as string) || (values.billDate as string) || undefined,
      paymentAccountId: paymentAccount.id,
      description: (values.remarks as string) || (values.itemDescription as string),
      currencyCode: 'INR',
      exchangeRate: 1,
      publish: true,
      categories: [
        {
          index: 1,
          expenseAccountId: expenseAccount.id,
          amount,
          description:
            (values.itemDescription as string) || (values.remarks as string),
        },
      ],
    };
  }

  private async resolvePaymentAccount() {
    const bankAccount = await this.accountModel().query().findOne({
      accountType: 'bank',
      active: true,
      isCashVault: false,
    });
    if (bankAccount) {
      return bankAccount;
    }
    return this.accountModel().query().findOne({
      accountType: 'cash',
      active: true,
      isCashVault: false,
    });
  }

  private getTransactionAmount(values: Record<string, unknown>): number | null {
    const directPayment = this.positiveAmount(values.payment);
    if (directPayment) {
      return directPayment;
    }
    const totalBillValue = this.positiveAmount(values.totalBillValue);
    if (totalBillValue) {
      return totalBillValue;
    }
    const derived = [
      values.basicValue,
      values.gst,
      values.freightOther,
      values.gstOnRCM,
      values.tdsDeducted,
      values.lateFeeAndInterest,
    ].reduce<number>(
      (total, value) => total + (this.positiveAmount(value) || 0),
      0,
    );
    return derived > 0 ? derived : null;
  }

  private positiveAmount(value: unknown): number | null {
    const amount = Number(value || 0);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  }

  private normalizePreviewRow(row: any, index: number): PreviewRow {
    return {
      rowNumber: row.rowNumber ?? row.row_number ?? index + 1,
      values: normalizeValues(row.values || {}),
      validationErrors: row.validationErrors ?? row.validation_errors ?? null,
    };
  }
}
