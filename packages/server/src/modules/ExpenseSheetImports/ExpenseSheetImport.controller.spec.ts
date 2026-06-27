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

    await expect(controller.upload({ sourceFilename: 'x.xlsx' })).resolves.toEqual({
      importId: 1,
    });
    await expect(controller.mapping(1, { headers: ['Bill No'] })).resolves.toEqual({
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
});
