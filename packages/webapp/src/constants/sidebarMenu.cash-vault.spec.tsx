// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('sidebar restricted operating scope', () => {
  it('removes sales inventory and banking navigation from normal sidebar', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'sidebarMenu.tsx'),
      'utf8',
    );

    expect(source).not.toContain("sidebar.sales_inventory");
    expect(source).not.toContain("sidebar.banking");
    expect(source).not.toContain("href: '/cashflow-accounts'");
    expect(source).not.toContain("href: '/items'");
    expect(source).not.toContain("sidebar.sales");
    expect(source).not.toContain("sidebar.purchases");
    expect(source).not.toContain("sidebar.contacts");
    expect(source).not.toContain("sidebar.cash_vault");
    expect(source).not.toContain("href: '/cash-vault'");
  });
});
