// @ts-nocheck
import React, { lazy } from 'react';
import { Switch, Route } from 'react-router';

import Dashboard from '@/components/Dashboard/Dashboard';

import { PrivatePagesProvider } from './PrivatePagesProvider';
import EnsureOrganizationIsReady from '../Guards/EnsureOrganizationIsReady';
import { EnsureAuthenticated } from '../Guards/EnsureAuthenticated';
import { EnsureUserEmailVerified } from '../Guards/EnsureUserEmailVerified';
import { CASH_VAULT_ROUTE } from '@/containers/CashVault/routes';

import '@/style/pages/Dashboard/Dashboard.scss';

const SetupWizardPage = lazy(() =>
  import('@/containers/Setup/WizardSetupPage').then((m) => ({
    default: m.WizardSetupPage,
  })),
);
const CashVaultScopedPage = lazy(() =>
  import('@/containers/CashVault').then((m) => ({
    default: m.CashVaultScopedPage,
  })),
);
/**
 * Dashboard inner private pages.
 */
export default function DashboardPrivatePages() {
  return (
    <EnsureAuthenticated>
      <EnsureUserEmailVerified>
        <PrivatePagesProvider>
          <Switch>
            <Route path={'/setup'} children={<SetupWizardPage />} />
            <Route path={CASH_VAULT_ROUTE}>
              <EnsureOrganizationIsReady>
                <CashVaultScopedPage />
              </EnsureOrganizationIsReady>
            </Route>
            <Route path="/">
              <EnsureOrganizationIsReady>
                <Dashboard />
              </EnsureOrganizationIsReady>
            </Route>
          </Switch>
        </PrivatePagesProvider>
      </EnsureUserEmailVerified>
    </EnsureAuthenticated>
  );
}
