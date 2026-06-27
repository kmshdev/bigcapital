import { APPROVED_EXPENSE_SHEET_COLUMNS } from './ExpenseSheetSchema';

export const ExpenseSheetImportResource = {
  resource: 'ExpenseSheetImport',
  currencyCode: 'INR',
  plaidRequired: false,
  columns: APPROVED_EXPENSE_SHEET_COLUMNS,
};
