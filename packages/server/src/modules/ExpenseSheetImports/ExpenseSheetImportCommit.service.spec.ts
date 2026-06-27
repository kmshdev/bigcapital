import { ExpenseSheetImportCommitService } from './ExpenseSheetImportCommit.service';

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
    const insert = jest.fn().mockResolvedValue([{ id: 1 }]);
    const rowModel = () => ({ query: () => ({ insert }) });
    const service = new ExpenseSheetImportCommitService({} as any, rowModel as any);

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
    expect(insert).toHaveBeenCalledWith([
      {
        importId: 5,
        rowNumber: 1,
        values: { billNo: 'B-1' },
        validationErrors: null,
        committedTransactionId: null,
      },
    ]);
  });
});
