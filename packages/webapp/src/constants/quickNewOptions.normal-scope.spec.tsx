import fs from 'fs';
import path from 'path';

describe('normal scoped quick new options', () => {
  it('offers purchase and expense entry paths plus spreadsheet import without sales/customer shortcuts', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'quickNewOptions.tsx'),
      'utf8',
    );

    expect(source).toContain("path: 'bills/new'");
    expect(source).toContain("path: 'payments-made/new'");
    expect(source).toContain("path: 'expenses/new'");
    expect(source).toContain("path: 'vendors/new'");
    expect(source).toContain("path: 'expenses/sheet-import'");
    expect(source).toContain("intl.get('expense_sheet_import.quick_new')");

    expect(source).not.toContain("path: 'invoices/new'");
    expect(source).not.toContain("path: 'customers/new'");
    expect(source).not.toContain("path: 'make-journal-entry'");
  });
});
