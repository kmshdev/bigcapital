import {
  APPROVED_EXPENSE_SHEET_COLUMNS,
  mapExpenseSheetHeaders,
} from './ExpenseSheetSchema';

describe('ExpenseSheetSchema', () => {
  it('contains the approved workbook headers from the provided schema file', () => {
    expect(APPROVED_EXPENSE_SHEET_COLUMNS.map((column) => column.header)).toEqual(
      [
        "Vendor's Name",
        'Bill No',
        'Item Description',
        'Bill Date',
        'Basic Value',
        'GST',
        'Freight Other',
        'Total Bill Value',
        'GST on RCM',
        'TDS Deducted',
        'LF & Intt',
        'Date',
        'Mode of Payment',
        'Payment',
        'Balance Payable',
        'Remarks',
      ],
    );
  });

  it('accepts any subset of approved headers and rejects unsupported columns', () => {
    expect(mapExpenseSheetHeaders(['Bill No', 'GST', 'Payment'])).toEqual({
      mapping: {
        'Bill No': 'billNo',
        GST: 'gst',
        Payment: 'payment',
      },
      unsupportedHeaders: [],
    });
    expect(mapExpenseSheetHeaders(['Bill No', 'Unknown'])).toEqual({
      mapping: {
        'Bill No': 'billNo',
      },
      unsupportedHeaders: ['Unknown'],
    });
  });
});
