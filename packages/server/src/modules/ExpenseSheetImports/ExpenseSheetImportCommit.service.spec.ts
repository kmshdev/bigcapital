import { ExpenseSheetImportCommitService } from './ExpenseSheetImportCommit.service';

const buildImportQuery = ({
  claimResult = 1,
  findById = jest.fn().mockResolvedValue({ id: 5, status: 'uploaded' }),
  patchAndFetchById = jest
    .fn()
    .mockResolvedValue({ id: 5, status: 'committed' }),
} = {}) => {
  const claimPatch = jest.fn().mockResolvedValue(claimResult);
  const whereNotIn = jest.fn(() => ({ patch: claimPatch }));
  const where = jest.fn(() => ({ whereNotIn }));

  return {
    claimPatch,
    importQuery: {
      findById,
      patchAndFetchById,
      where,
    },
  };
};

describe('ExpenseSheetImportCommitService', () => {
  it('defaults staged expense rows to the business main expense account', () => {
    const service = new ExpenseSheetImportCommitService({} as any, {} as any);
    const rows = service.previewRows(
      [
        {
          "Vendor's Name": 'ABC Vendor',
          'Bill No': 'B-1',
          'Basic Value': '1200.50',
        },
      ],
      {
        defaultExpenseAccountName: 'Risingstone infra pvt ltd_main_01',
        defaultExpenseAccountSlug: 'risingstone_infra_pvt_ltd-main-01',
      },
    );

    expect(rows[0].values).toEqual(
      expect.objectContaining({
        defaultExpenseAccountName: 'Risingstone infra pvt ltd_main_01',
        defaultExpenseAccountSlug: 'risingstone_infra_pvt_ltd-main-01',
      }),
    );
  });

  it('validates INR decimals, dates, unsupported columns, and duplicate bill references', () => {
    const service = new ExpenseSheetImportCommitService({} as any, {} as any);
    const rows = service.previewRows([
      {
        'Bill No': 'B-1',
        'Bill Date': '2026-06-27',
        'Basic Value': '1200.50',
        GST: '216',
      },
      {
        'Bill No': 'B-1',
        'Bill Date': 'bad-date',
        Payment: 'not-money',
        Unsupported: 'x',
      },
    ]);

    expect(rows[0].validationErrors).toEqual(null);
    expect(rows[0].values).toEqual(
      expect.objectContaining({
        billNo: 'B-1',
        basicValue: 1200.5,
        gst: 216,
        currencyCode: 'INR',
      }),
    );
    expect(rows[1].validationErrors).toEqual(
      expect.objectContaining({
        billNo: ['duplicate_bill_reference'],
        billDate: ['invalid_date'],
        payment: ['invalid_inr_amount'],
        Unsupported: ['unsupported_column'],
      }),
    );
  });

  it('commits only valid rows without partial invalid-row records', async () => {
    const { claimPatch, importQuery } = buildImportQuery();
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn().mockResolvedValue({ id: 1 });
    const rowModel = () => ({ query: () => ({ insert }) });
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
    );

    await expect(
      service.commitRows(5, [
        { rowNumber: 1, values: { billNo: 'B-1' }, validationErrors: null },
        {
          rowNumber: 2,
          values: { billNo: 'B-2' },
          validationErrors: { billNo: ['duplicate_bill_reference'] },
        },
      ]),
    ).resolves.toEqual({ committed: 1, rejected: 1 });

    expect(claimPatch).toHaveBeenCalledWith({ status: 'committing' });
    expect(insert).toHaveBeenCalledWith({
      importId: 5,
      rowNumber: 1,
      values: { billNo: 'B-1' },
      validationErrors: null,
      committedTransactionId: null,
    });
    expect(importQuery.patchAndFetchById).toHaveBeenCalledWith(5, {
      status: 'committed',
    });
    expect(claimPatch.mock.invocationCallOrder[0]).toBeLessThan(
      importQuery.patchAndFetchById.mock.invocationCallOrder[0],
    );
  });

  it('rejects already committed imports without inserting rows or posting expenses', async () => {
    const findById = jest.fn().mockResolvedValue({ id: 5, status: 'committed' });
    const { importQuery } = buildImportQuery({ claimResult: 0, findById });
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn();
    const rowModel = () => ({ query: () => ({ insert }) });
    const createExpense = {
      newExpense: jest.fn(),
    };
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
      undefined,
      createExpense as any,
    );

    await expect(
      service.commitRows(5, [
        { rowNumber: 1, values: { billNo: 'B-1' }, validationErrors: null },
      ]),
    ).rejects.toThrow('expense_sheet_import_already_committed');

    expect(insert).not.toHaveBeenCalled();
    expect(createExpense.newExpense).not.toHaveBeenCalled();
    expect(importQuery.patchAndFetchById).not.toHaveBeenCalled();
  });

  it('rejects imports already being committed without inserting rows or posting expenses', async () => {
    const findById = jest.fn().mockResolvedValue({ id: 5, status: 'committing' });
    const { importQuery } = buildImportQuery({ claimResult: 0, findById });
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn();
    const rowModel = () => ({ query: () => ({ insert }) });
    const createExpense = {
      newExpense: jest.fn(),
    };
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
      undefined,
      createExpense as any,
    );

    await expect(
      service.commitRows(5, [
        { rowNumber: 1, values: { billNo: 'B-1' }, validationErrors: null },
      ]),
    ).rejects.toThrow('expense_sheet_import_already_committed');

    expect(insert).not.toHaveBeenCalled();
    expect(createExpense.newExpense).not.toHaveBeenCalled();
    expect(importQuery.patchAndFetchById).not.toHaveBeenCalled();
  });

  it('throws not found when the atomic claim loses and the import no longer exists', async () => {
    const findById = jest.fn().mockResolvedValue(null);
    const { importQuery } = buildImportQuery({ claimResult: 0, findById });
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn();
    const rowModel = () => ({ query: () => ({ insert }) });
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
    );

    await expect(
      service.commitRows(5, [
        { rowNumber: 1, values: { billNo: 'B-1' }, validationErrors: null },
      ]),
    ).rejects.toThrow('expense_sheet_import_not_found');

    expect(insert).not.toHaveBeenCalled();
    expect(importQuery.patchAndFetchById).not.toHaveBeenCalled();
  });

  it('commits serialized preview rows with MySQL-compatible single-row inserts', async () => {
    const { claimPatch, importQuery } = buildImportQuery();
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn((payload) => {
      if (Array.isArray(payload)) {
        throw new Error('batch insert only works with Postgresql and SQL Server');
      }
      return Promise.resolve({ id: 1 });
    });
    const rowPatchAndFetchById = jest.fn().mockResolvedValue({});
    const rowModel = () => ({
      query: () => ({ insert, patchAndFetchById: rowPatchAndFetchById }),
    });
    const query = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 31, slug: 'risingstone-main-01' })
        .mockResolvedValueOnce({ id: 12, accountType: 'bank' }),
    };
    const accountModel = () => ({ query: () => query });
    const createExpense = {
      newExpense: jest.fn().mockResolvedValue({ id: 77 }),
    };
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
      accountModel as any,
      createExpense as any,
    );

    await expect(
      service.commitRows(5, [
        {
          row_number: 1,
          values: {
            bill_no: 'B-1',
            payment_date: '2026-06-28',
            payment: 1200,
            item_description: 'Cement',
            remarks: 'Site purchase',
            default_expense_account_slug: 'risingstone-main-01',
          },
          validation_errors: null,
        } as any,
      ]),
    ).resolves.toEqual({ committed: 1, rejected: 0, postedExpenses: 1 });

    expect(claimPatch).toHaveBeenCalledWith({ status: 'committing' });
    expect(insert).toHaveBeenCalledWith({
      importId: 5,
      rowNumber: 1,
      values: expect.objectContaining({
        billNo: 'B-1',
        payment: 1200,
        defaultExpenseAccountSlug: 'risingstone-main-01',
      }),
      validationErrors: null,
      committedTransactionId: null,
    });
    expect(createExpense.newExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceNo: 'B-1',
        paymentDate: '2026-06-28',
        paymentAccountId: 12,
      }),
    );
    expect(rowPatchAndFetchById).toHaveBeenCalledWith(1, {
      committedTransactionId: 77,
    });
    expect(importQuery.patchAndFetchById).toHaveBeenCalledWith(5, {
      status: 'committed',
    });
    expect(claimPatch.mock.invocationCallOrder[0]).toBeLessThan(
      importQuery.patchAndFetchById.mock.invocationCallOrder[0],
    );
  });

  it('marks the import failed and rethrows if commit side effects fail after claim', async () => {
    const importPatchAndFetchById = jest
      .fn()
      .mockResolvedValueOnce({ id: 5, status: 'failed' });
    const { importQuery } = buildImportQuery({
      patchAndFetchById: importPatchAndFetchById,
    });
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn().mockResolvedValue({ id: 91 });
    const rowPatchError = new Error('row_patch_failed');
    const rowPatchAndFetchById = jest
      .fn()
      .mockRejectedValueOnce(rowPatchError);
    const rowModel = () => ({
      query: () => ({ insert, patchAndFetchById: rowPatchAndFetchById }),
    });
    const accountQuery = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 31, slug: 'risingstone-main-01' })
        .mockResolvedValueOnce({ id: 12, accountType: 'bank' }),
    };
    const accountModel = () => ({ query: () => accountQuery });
    const createExpense = {
      newExpense: jest.fn().mockResolvedValueOnce({ id: 501 }),
    };
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
      accountModel as any,
      createExpense as any,
    );

    await expect(
      service.commitRows(5, [
        {
          rowNumber: 1,
          values: {
            billNo: 'B-1',
            paymentDate: '2026-06-28',
            payment: 1200,
            itemDescription: 'Cement',
            defaultExpenseAccountSlug: 'risingstone-main-01',
          },
          validationErrors: null,
        },
      ]),
    ).rejects.toThrow('row_patch_failed');

    expect(createExpense.newExpense).toHaveBeenCalledTimes(1);
    expect(importQuery.patchAndFetchById).toHaveBeenCalledWith(5, {
      status: 'failed',
    });
    expect(importQuery.patchAndFetchById).not.toHaveBeenCalledWith(5, {
      status: 'committed',
    });
  });

  it('posts valid paid rows into the existing expense flow when account dependencies are available', async () => {
    const { importQuery } = buildImportQuery();
    const importModel = () => ({ query: () => importQuery });
    const insert = jest.fn().mockResolvedValue({ id: 1 });
    const rowPatchAndFetchById = jest.fn().mockResolvedValue({});
    const rowModel = () => ({
      query: () => ({ insert, patchAndFetchById: rowPatchAndFetchById }),
    });
    const query = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 31, slug: 'risingstone-main-01' })
        .mockResolvedValueOnce({ id: 12, accountType: 'bank' }),
    };
    const accountModel = () => ({ query: () => query });
    const createExpense = {
      newExpense: jest.fn().mockResolvedValue({ id: 77 }),
    };
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
      accountModel as any,
      createExpense as any,
    );

    await expect(
      service.commitRows(5, [
        {
          rowNumber: 1,
          values: {
            billNo: 'B-1',
            billDate: '2026-06-27',
            paymentDate: '2026-06-28',
            payment: 1200,
            totalBillValue: 1250,
            itemDescription: 'Cement',
            remarks: 'Site purchase',
            defaultExpenseAccountSlug: 'risingstone-main-01',
          },
          validationErrors: null,
        },
      ]),
    ).resolves.toEqual({ committed: 1, rejected: 0, postedExpenses: 1 });

    expect(createExpense.newExpense).toHaveBeenCalledWith({
      referenceNo: 'B-1',
      paymentDate: '2026-06-28',
      paymentAccountId: 12,
      description: 'Site purchase',
      currencyCode: 'INR',
      exchangeRate: 1,
      publish: true,
      categories: [
        {
          index: 1,
          expenseAccountId: 31,
          amount: 1200,
          description: 'Cement',
        },
      ],
    });
    expect(rowPatchAndFetchById).toHaveBeenCalledWith(1, {
      committedTransactionId: 77,
    });
    expect(importQuery.patchAndFetchById).toHaveBeenCalledWith(5, {
      status: 'committed',
    });
  });

  it('records posted expense ids and marks the import committed', async () => {
    const { claimPatch, importQuery } = buildImportQuery();
    const importModel = () => ({ query: () => importQuery });
    const insertedRows = [{ id: 91 }, { id: 92 }];
    const insert = jest
      .fn()
      .mockResolvedValueOnce(insertedRows[0])
      .mockResolvedValueOnce(insertedRows[1]);
    const rowPatchAndFetchById = jest.fn().mockResolvedValue({});
    const rowModel = () => ({
      query: () => ({
        insert,
        patchAndFetchById: rowPatchAndFetchById,
      }),
    });
    const accountQuery = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({ id: 31, slug: 'risingstone-main-01' })
        .mockResolvedValueOnce({ id: 12, accountType: 'bank' })
        .mockResolvedValueOnce({ id: 31, slug: 'risingstone-main-01' })
        .mockResolvedValueOnce({ id: 12, accountType: 'bank' }),
    };
    const accountModel = () => ({ query: () => accountQuery });
    const createExpense = {
      newExpense: jest
        .fn()
        .mockResolvedValueOnce({ id: 501 })
        .mockResolvedValueOnce({ id: 502 }),
    };
    const service = new ExpenseSheetImportCommitService(
      importModel as any,
      rowModel as any,
      accountModel as any,
      createExpense as any,
    );

    await expect(
      service.commitRows(5, [
        {
          rowNumber: 1,
          values: {
            billNo: 'B-1',
            paymentDate: '2026-06-28',
            payment: 1200,
            itemDescription: 'Cement',
            defaultExpenseAccountSlug: 'risingstone-main-01',
          },
          validationErrors: null,
        },
        {
          rowNumber: 2,
          values: {
            billNo: 'B-2',
            paymentDate: '2026-06-29',
            payment: 900,
            itemDescription: 'Steel',
            defaultExpenseAccountSlug: 'risingstone-main-01',
          },
          validationErrors: null,
        },
      ]),
    ).resolves.toEqual({
      committed: 2,
      rejected: 0,
      postedExpenses: 2,
    });

    expect(claimPatch).toHaveBeenCalledWith({ status: 'committing' });
    expect(rowPatchAndFetchById).toHaveBeenCalledWith(91, {
      committedTransactionId: 501,
    });
    expect(rowPatchAndFetchById).toHaveBeenCalledWith(92, {
      committedTransactionId: 502,
    });
    expect(importQuery.patchAndFetchById).toHaveBeenCalledWith(5, {
      status: 'committed',
    });
    expect(claimPatch.mock.invocationCallOrder[0]).toBeLessThan(
      importQuery.patchAndFetchById.mock.invocationCallOrder[0],
    );
  });
});
