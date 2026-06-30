// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('ExpenseSheetImport', () => {
  it('uses INR expense-sheet endpoints and avoids Plaid flows', () => {
    const pageSource = fs.readFileSync(
      path.join(__dirname, 'ExpenseSheetImport.tsx'),
      'utf8',
    );
    const hooksSource = fs.readFileSync(
      path.join(__dirname, '../../hooks/query/import/queries.ts'),
      'utf8',
    );

    expect(hooksSource).toContain('/expense-sheet-imports');
    expect(pageSource).toContain('INR');
    expect(pageSource).toContain('row.rowNumber ?? row.row_number');
    expect(pageSource).toContain('row.validationErrors ?? row.validation_errors');
    expect(pageSource).toContain('setPreviewRows((response.rows || []).map(normalizePreviewRow))');
    expect(pageSource).not.toContain('plaid');
    expect(pageSource).not.toContain('Plaid');
  });
});
