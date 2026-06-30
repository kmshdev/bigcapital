// @ts-nocheck
import intl from 'react-intl-universal';
import {
  AbilitySubject,
  VendorAction,
  ExpenseAction,
  BillAction,
  PaymentMadeAction,
} from './abilityOption';
import { useAbilitiesFilter } from '../hooks';

export const getQuickNewActions = () => [
  {
    path: 'bills/new',
    name: intl.get('purchase_invoice'),
    permission: {
      subject: AbilitySubject.Bill,
      ability: BillAction.Create,
    },
  },
  {
    path: 'payments-made/new',
    name: intl.get('payment_made'),
    permission: {
      subject: AbilitySubject.PaymentMade,
      ability: PaymentMadeAction.Create,
    },
  },
  {
    path: 'expenses/new',
    name: intl.get('expense'),
    permission: {
      subject: AbilitySubject.Expense,
      ability: ExpenseAction.Create,
    },
  },
  {
    path: 'vendors/new',
    name: intl.get('vendor'),
    permission: {
      subject: AbilitySubject.Vendor,
      ability: VendorAction.Create,
    },
  },
  {
    path: 'expenses/sheet-import',
    name: intl.get('expense_sheet_import.quick_new'),
    permission: {
      subject: AbilitySubject.Expense,
      ability: ExpenseAction.Create,
    },
  },
];

/**
 * Retrieve the dashboard quick new menu items.
 */
export const useGetQuickNewMenu = () => {
  const quickNewMenu = getQuickNewActions();
  const abilitiesFilter = useAbilitiesFilter();

  return abilitiesFilter(quickNewMenu);
};
