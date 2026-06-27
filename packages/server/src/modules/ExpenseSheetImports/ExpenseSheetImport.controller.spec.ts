import { ExpenseSheetImportController } from './ExpenseSheetImport.controller';

describe('ExpenseSheetImportController', () => {
  it('exposes upload, mapping, preview, and commit methods through the service', async () => {
    const app = {
      upload: jest.fn().mockResolvedValue({ importId: 1 }),
      mapping: jest.fn().mockResolvedValue({ mapping: {} }),
      preview: jest.fn().mockResolvedValue({ rows: [] }),
      commit: jest.fn().mockResolvedValue({ committed: 1, rejected: 0 }),
    };
    const controller = new ExpenseSheetImportController(app as any);

    await expect(
      controller.upload({ sourceFilename: 'x.xlsx' }),
    ).resolves.toEqual({
      importId: 1,
    });
    await expect(
      controller.mapping(1, { headers: ['Bill No'] }),
    ).resolves.toEqual({
      mapping: {},
    });
    await expect(controller.preview(1, { rows: [] })).resolves.toEqual({
      rows: [],
    });
    await expect(controller.commit(1, { rows: [] })).resolves.toEqual({
      committed: 1,
      rejected: 0,
    });
  });

  it('passes uploaded workbook files to the import application', async () => {
    const file = {
      originalname: 'expenses.xlsx',
      buffer: Buffer.from('workbook-bytes'),
    } as Express.Multer.File;
    const app = {
      uploadFromFile: jest.fn().mockResolvedValue({ importId: 7, rows: [] }),
    };
    const controller = new ExpenseSheetImportController(app as any);

    await expect(
      (controller.upload as any)(file, { uploadedByUserId: 12 }),
    ).resolves.toEqual({ importId: 7, rows: [] });
    expect(app.uploadFromFile).toHaveBeenCalledWith(file, {
      uploadedByUserId: 12,
    });
  });
});
