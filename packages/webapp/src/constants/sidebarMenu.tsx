// @ts-nocheck
import React from 'react';
import { FormattedMessage as T } from '@/components';
import { Features } from '@/constants/features';
import {
  ISidebarMenuItemType,
  ISidebarMenuOverlayIds,
} from '@/containers/Dashboard/Sidebar/interfaces';
import {
  ReportsAction,
  AbilitySubject,
  ItemAction,
  InventoryAdjustmentAction,
  SaleEstimateAction,
  SaleInvoiceAction,
  SaleReceiptAction,
  PaymentReceiveAction,
  BillAction,
  PaymentMadeAction,
  CustomerAction,
  VendorAction,
  AccountAction,
  ManualJournalAction,
  ExpenseAction,
  CashflowAction,
  PreferencesAbility,
  TaxRateAction,
} from '@/constants/abilityOption';
import { DialogsName } from './dialogs';

export const SidebarMenu = [
  // ---------------
  // # Homepage
  // ---------------
  {
    text: <T id={'sidebar.homepage'} />,
    type: ISidebarMenuItemType.Link,
    disabled: false,
    href: '/',
    matchExact: true,
  },
  // ---------------
  // # Accounting
  // ---------------
  {
    text: <T id={'sidebar.accounting'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.financial'} />,
        type: ISidebarMenuItemType.Overlay,
        overlayId: ISidebarMenuOverlayIds.Financial,
        children: [
          {
            text: <T id={'sidebar.financial'} />,
            type: ISidebarMenuItemType.Group,
            children: [
              {
                text: <T id={'sidebar.accounts_chart'} />,
                href: '/accounts',
                type: ISidebarMenuItemType.Link,
                permission: {
                  subject: AbilitySubject.Account,
                  ability: AccountAction.View,
                },
              },
              {
                text: <T id={'sidebar.manual_journals'} />,
                href: '/manual-journals',
                type: ISidebarMenuItemType.Link,
                permission: {
                  subject: AbilitySubject.ManualJournal,
                  ability: ManualJournalAction.View,
                },
              },
              {
                text: <T id={'sidebar.transactions_locaking'} />,
                href: '/transactions-locking',
                type: ISidebarMenuItemType.Link,
              },
              {
                text: 'Tax Rates',
                href: '/tax-rates',
                type: ISidebarMenuItemType.Link,
                permission: {
                  subject: AbilitySubject.TaxRate,
                  ability: TaxRateAction.View,
                },
              },
            ],
          },
          {
            text: <T id={'sidebar.new_tasks'} />,
            type: ISidebarMenuItemType.Group,
            children: [
              {
                text: <T id={'sidebar.make_journal_entry'} />,
                href: '/make-journal-entry',
                type: ISidebarMenuItemType.Link,
                permission: {
                  subject: AbilitySubject.ManualJournal,
                  ability: ManualJournalAction.Create,
                },
              },
            ],
          },
        ],
      },
    ],
  },
  // ---------------
  // # Expenses
  // ---------------
  {
    text: <T id={'sidebar.expenses'} />,
    type: ISidebarMenuItemType.Overlay,
    overlayId: ISidebarMenuOverlayIds.Expenses,
    children: [
      {
        text: <T id={'sidebar.expenses'} />,
        type: ISidebarMenuItemType.Group,
        children: [
          {
            text: <T id={'sidebar.expenses'} />,
            href: '/expenses',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Expense,
              ability: ExpenseAction.View,
            },
          },
        ],
      },
      {
        text: <T id={'sidebar.new_tasks'} />,
        type: ISidebarMenuItemType.Group,
        children: [
          {
            text: <T id={'sidebar.new_expense'} />,
            href: '/expenses/new',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Expense,
              ability: ExpenseAction.Create,
            },
          },
        ],
      },
    ],
  },
  // ---------------
  // # Reports
  // ---------------
  {
    text: <T id={'sidebar.reports'} />,
    type: ISidebarMenuItemType.Overlay,
    overlayId: ISidebarMenuOverlayIds.Reports,
    children: [
      {
        text: <T id={'sidebar.reports'} />,
        type: ISidebarMenuItemType.Group,
        children: [
          {
            text: <T id={'sidebar.balance_sheet'} />,
            href: '/financial-reports/balance-sheet',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_BALANCE_SHEET,
            },
          },
          {
            text: <T id={'sidebar.trial_balance_sheet'} />,
            href: '/financial-reports/trial-balance-sheet',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_TRIAL_BALANCE_SHEET,
            },
          },
          {
            text: <T id={'sidebar.journal'} />,
            href: '/financial-reports/journal-sheet',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_JOURNAL,
            },
          },
          {
            text: <T id={'sidebar.general_ledger'} />,
            href: '/financial-reports/general-ledger',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_GENERAL_LEDGET,
            },
          },
          {
            text: <T id={'sidebar.profit_loss_sheet'} />,
            href: '/financial-reports/profit-loss-sheet',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_PROFIT_LOSS,
            },
          },
          {
            text: <T id={'sidebar.cash_flow_statement'} />,
            href: '/financial-reports/cash-flow',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_CASHFLOW_ACCOUNT_TRANSACTION,
            },
          },
          {
            text: <T id={'sidebar.ar_aging_Summary'} />,
            href: '/financial-reports/receivable-aging-summary',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_AR_AGING_SUMMARY,
            },
          },
          {
            text: <T id={'sidebar.ap_aging_summary'} />,
            href: '/financial-reports/payable-aging-summary',
            type: ISidebarMenuItemType.Link,
            permission: {
              subject: AbilitySubject.Report,
              ability: ReportsAction.READ_AP_AGING_SUMMARY,
            },
          },
        ],
      },
    ],
  },
  {
    text: <T id={'sidebar.system'} />,
    type: ISidebarMenuItemType.Group,
    children: [
      {
        text: <T id={'sidebar.preferences'} />,
        href: '/preferences',
        type: ISidebarMenuItemType.Link,
        permission: {
          subject: AbilitySubject.Preferences,
          ability: PreferencesAbility.Mutate,
        },
      },
    ],
  },
];
