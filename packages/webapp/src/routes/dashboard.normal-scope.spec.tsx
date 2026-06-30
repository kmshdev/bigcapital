// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('dashboard schema-bounded normal app scope', () => {
  it('keeps vendor, bill, payment-made, expense, tax-rate, and spreadsheet import routes available', () => {
    const source = fs.readFileSync(path.join(__dirname, 'dashboard.tsx'), 'utf8');

    expect(source).toContain("path: `/vendors`");
    expect(source).toContain("path: `/bills`");
    expect(source).toContain("path: `/payments-made`");
    expect(source).toContain("path: `/expenses`");
    expect(source).toContain("path: '/tax-rates'");
    expect(source).toContain("path: `/expenses/sheet-import`");

    expect(source).not.toContain("'/vendors'");
    expect(source).not.toContain("'/bills'");
    expect(source).not.toContain("'/payments-made'");
  });
});
