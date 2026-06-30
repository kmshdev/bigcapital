import { ExpenseSheetImportApplication } from './ExpenseSheetImport.application';

describe('ExpenseSheetImportApplication', () => {
  it('normalizes FormData uploadedByUserId values before creating the import', async () => {
    const commitService = {
      upload: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const app = new ExpenseSheetImportApplication(
      commitService as any,
      {} as any,
    );

    await app.upload({
      sourceFilename: 'expense-sheet.tsv',
      uploadedByUserId: '12' as any,
    });

    expect(commitService.upload).toHaveBeenCalledWith('expense-sheet.tsv', 12);
  });

  it('adds the current business default expense account to preview rows', async () => {
    const commitService = {
      previewRows: jest.fn().mockReturnValue([{ rowNumber: 1 }]),
    };
    const tenancyContext = {
      getTenant: jest.fn().mockResolvedValue({
        organizationId: 'risingstone_infra_pvt_ltd',
        metadata: { name: 'Risingstone infra pvt ltd' },
      }),
    };
    const app = new ExpenseSheetImportApplication(
      commitService as any,
      tenancyContext as any,
    );

    await expect(
      app.preview(1, { rows: [{ 'Bill No': 'B-1' }] }),
    ).resolves.toEqual({ rows: [{ rowNumber: 1 }] });
    expect(commitService.previewRows).toHaveBeenCalledWith(
      [{ 'Bill No': 'B-1' }],
      {
        defaultExpenseAccountName: 'Risingstone infra pvt ltd_main_01',
        defaultExpenseAccountSlug: 'risingstone_infra_pvt_ltd-main-01',
      },
    );
  });
});
