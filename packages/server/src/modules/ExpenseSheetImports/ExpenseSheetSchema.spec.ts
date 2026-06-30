import {
  APPROVED_EXPENSE_SHEET_COLUMNS,
  getExpenseSheetColumn,
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

  it('matches uploaded row keys after response serialization changes header casing', () => {
    expect(getExpenseSheetColumn('bill _no')?.field).toBe('billNo');
    expect(getExpenseSheetColumn('basic _value')?.field).toBe('basicValue');
    expect(getExpenseSheetColumn('g_s_t')?.field).toBe('gst');
    expect(getExpenseSheetColumn('freight\t_other')?.field).toBe(
      'freightOther',
    );
    expect(getExpenseSheetColumn('balance _payable\t')?.field).toBe(
      'balancePayable',
    );
  });
});
