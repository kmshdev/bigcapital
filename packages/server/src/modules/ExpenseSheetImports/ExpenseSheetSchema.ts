const cleanHeader = (header: string) => header.replace(/\s+/g, ' ').trim();

export const APPROVED_EXPENSE_SHEET_COLUMNS = [
  { header: "Vendor's Name", field: 'vendorName', type: 'string' },
  { header: 'Bill No', field: 'billNo', type: 'string' },
  { header: 'Item Description', field: 'itemDescription', type: 'string' },
  { header: 'Bill Date', field: 'billDate', type: 'date' },
  { header: 'Basic Value', field: 'basicValue', type: 'money' },
  { header: 'GST', field: 'gst', type: 'money' },
  { header: 'Freight Other', field: 'freightOther', type: 'money' },
  { header: 'Total Bill Value', field: 'totalBillValue', type: 'money' },
  { header: 'GST on RCM', field: 'gstOnRcm', type: 'money' },
  { header: 'TDS Deducted', field: 'tdsDeducted', type: 'money' },
  { header: 'LF & Intt', field: 'lfAndInterest', type: 'money' },
  { header: 'Date', field: 'paymentDate', type: 'date' },
  { header: 'Mode of Payment', field: 'modeOfPayment', type: 'string' },
  { header: 'Payment', field: 'payment', type: 'money' },
  { header: 'Balance Payable', field: 'balancePayable', type: 'money' },
  { header: 'Remarks', field: 'remarks', type: 'string' },
] as const;

type ExpenseSheetColumn = (typeof APPROVED_EXPENSE_SHEET_COLUMNS)[number];

const columnsByHeader = new Map<string, ExpenseSheetColumn>(
  APPROVED_EXPENSE_SHEET_COLUMNS.map((column) => [column.header, column]),
);

export function mapExpenseSheetHeaders(headers: string[]) {
  return headers.reduce(
    (result, rawHeader) => {
      const header = cleanHeader(rawHeader);
      const column = columnsByHeader.get(header);
      if (column) {
        result.mapping[header] = column.field;
      } else {
        result.unsupportedHeaders.push(header);
      }
      return result;
    },
    {
      mapping: {} as Record<string, string>,
      unsupportedHeaders: [] as string[],
    },
  );
}

export function getExpenseSheetColumn(header: string) {
  return columnsByHeader.get(cleanHeader(header));
}
