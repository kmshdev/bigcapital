// @ts-nocheck
import fs from 'fs';
import path from 'path';

describe('Cash Vault route isolation', () => {
  it('keeps the full Cash Vault surface out of dashboard routes', () => {
    const dashboardRoutes = fs.readFileSync(
      path.join(__dirname, 'dashboard.tsx'),
      'utf8',
    );
    const privatePages = fs.readFileSync(
      path.join(__dirname, '../components/Dashboard/PrivatePages.tsx'),
      'utf8',
    );
    const routeSource = fs.readFileSync(
      path.join(__dirname, '../containers/CashVault/routes.ts'),
      'utf8',
    );

    expect(dashboardRoutes).not.toContain('path: `/cash-vault`');
    expect(privatePages).not.toContain("path={'/cash-vault'}");
    expect(privatePages).toContain('path={CASH_VAULT_ROUTE}');
    expect(routeSource).toContain("CASH_VAULT_ROUTE = '/\\uFFFC'");
    expect(privatePages).toContain('CashVaultScopedPage');
  });
});
