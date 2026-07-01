// @ts-nocheck
import React, { useState } from 'react';
import { writeXlsx } from 'hucre/xlsx';
import {
  Button,
  Card,
  Classes,
  FormGroup,
  H2,
  H3,
  HTMLTable,
  InputGroup,
  Intent,
  NumericInput,
  Spinner,
} from '@blueprintjs/core';
import { FormattedMessage as T } from '@/components';
import { useCurrentOrganizationName } from '@/hooks/query';
import {
  useCashVaultAccounts,
  useCashVaultExpenses,
  useCreateCashVaultExpense,
} from './hooks';

const defaultExpenseValues = {
  paymentDate: new Date().toISOString().slice(0, 10),
  expenseAccountId: 1000,
  amount: 0,
  description: '',
  referenceNo: '',
};

const defaultFilterValues = {
  date: '',
  individualIdentifier: '',
  description: '',
};

const vaultPalette = {
  slateLedger: {
    surface: '#1c242d',
    mutedSurface: '#12161c',
    line: '#2d3642',
    accent: '#a9b4c0',
    text: '#f3f6f8',
  },
  actionBlue: {
    surface: '#172642',
    line: '#2f6fe4',
    accent: '#8fb5ff',
    strong: '#2f6fe4',
  },
  rupeeGreen: {
    surface: '#162b22',
    line: '#36a269',
    accent: '#87d7a7',
    strong: '#d9ffe6',
  },
};

const filterTone = {
  date: 'actionBlue',
  individualIdentifier: 'actionBlue',
  description: 'slateLedger',
};

const columnTone = {
  date: 'slateLedger',
  individualIdentifier: 'actionBlue',
  description: 'slateLedger',
  amount: 'rupeeGreen',
};

const alternateColumnStyles = [
  { background: 'rgba(28, 36, 45, 0.92)' },
  { background: 'rgba(18, 22, 28, 0.92)' },
];

const formatCurrency = (amount, currencyCode = 'INR') =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
  }).format(Number(amount || 0));

const firstPresent = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const getExpenseDate = (expense) =>
  firstPresent(
    expense.formattedDate,
    expense.formatted_date,
    expense.paymentDate,
    expense.payment_date,
  );

const getExpenseReference = (expense) =>
  firstPresent(expense.referenceNo, expense.reference_no);

const getExpenseDescription = (expense) =>
  firstPresent(expense.description, '');

const getExpenseTotalAmount = (expense) =>
  firstPresent(expense.totalAmount, expense.total_amount, 0);

const getExpenseFormattedAmount = (expense) =>
  firstPresent(expense.formattedAmount, expense.formatted_amount);

const getExpenseCurrencyCode = (expense) =>
  firstPresent(expense.currencyCode, expense.currency_code, 'INR');

const getExpenseFilterDate = (expense) =>
  firstPresent(
    expense.paymentDate,
    expense.payment_date,
    expense.formattedDate,
    expense.formatted_date,
  );

const normalizeFilterValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const getExpenseSortValue = (expense, key) => {
  if (key === 'date') {
    return String(getExpenseFilterDate(expense) || '');
  }
  if (key === 'individualIdentifier') {
    return normalizeFilterValue(getExpenseReference(expense));
  }
  if (key === 'description') {
    return normalizeFilterValue(getExpenseDescription(expense));
  }
  return Number(getExpenseTotalAmount(expense) || 0);
};

const getExpenseRowId = (expense, index) =>
  String(
    firstPresent(
      expense.id,
      expense.expenseId,
      expense.expense_id,
      `${getExpenseDate(expense) || 'date'}-${getExpenseReference(expense) || 'ref'}-${index}`,
    ),
  );

const downloadFile = (content, filename, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const getLedgerDisplayName = (account) => {
  if (account.name?.startsWith('TEST_LEDGER_')) {
    return account.name;
  }
  const id = Number(account.id || 0);
  const number = 100000 + Math.abs((id * 7919) % 900000);
  return `TEST_LEDGER_${number}`;
};

function CashVaultExpenseLedgerTable({
  expenses,
  isLoading,
  filterValues,
  onFilterValueChange,
  onClearFilters,
  onExportFilteredRows,
  unhideTotalAmount = false,
}) {
  const [sortState, setSortState] = useState({
    key: 'date',
    direction: 'desc',
  });
  const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const activeFilterCount = Object.values(filterValues).filter(Boolean).length;
  const filteredExpenses = expenses.filter((expense) => {
    const dateFilter = normalizeFilterValue(filterValues.date);
    const individualIdentifierFilter = normalizeFilterValue(
      filterValues.individualIdentifier,
    );
    const descriptionFilter = normalizeFilterValue(filterValues.description);
    const expenseDate = String(getExpenseFilterDate(expense) || '').slice(0, 10);
    const individualIdentifier = normalizeFilterValue(
      getExpenseReference(expense),
    );
    const description = normalizeFilterValue(getExpenseDescription(expense));

    return (
      (!dateFilter || expenseDate === dateFilter) &&
      (!individualIdentifierFilter ||
        individualIdentifier.includes(individualIdentifierFilter)) &&
      (!descriptionFilter || description.includes(descriptionFilter))
    );
  });
  const sortedExpenses = [...filteredExpenses].sort((left, right) => {
    const leftValue = getExpenseSortValue(left, sortState.key);
    const rightValue = getExpenseSortValue(right, sortState.key);
    const direction = sortState.direction === 'asc' ? 1 : -1;

    if (leftValue > rightValue) {
      return direction;
    }
    if (leftValue < rightValue) {
      return -direction;
    }
    return 0;
  });
  const pageCount = Math.max(1, Math.ceil(sortedExpenses.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedExpenses = sortedExpenses.slice(pageStart, pageStart + pageSize);
  const selectedCount = selectedExpenseIds.length;
  const totalExpenses = filteredExpenses.reduce(
    (total, expense) => total + Number(getExpenseTotalAmount(expense) || 0),
    0,
  );
  const visibleRowIds = pagedExpenses.map((expense, index) =>
    getExpenseRowId(expense, pageStart + index),
  );
  const areVisibleRowsSelected =
    visibleRowIds.length > 0 &&
    visibleRowIds.every((id) => selectedExpenseIds.includes(id));

  const setFilterValue = (name, value) => {
    setCurrentPage(1);
    onFilterValueChange(name, value);
  };

  const clearFilters = () => {
    setCurrentPage(1);
    onClearFilters();
  };

  const toggleSort = (key) => {
    setSortState((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleRowSelection = (id) => {
    setSelectedExpenseIds((previous) =>
      previous.includes(id)
        ? previous.filter((selectedId) => selectedId !== id)
        : [...previous, id],
    );
  };

  const toggleVisibleRowsSelection = () => {
    setSelectedExpenseIds((previous) => {
      if (areVisibleRowsSelected) {
        return previous.filter((id) => !visibleRowIds.includes(id));
      }
      return Array.from(new Set([...previous, ...visibleRowIds]));
    });
  };

  const filterInputStyle = (tone) => ({
    background: vaultPalette.slateLedger.mutedSurface,
    border: `1px solid ${vaultPalette.slateLedger.line}`,
    borderLeft: `4px solid ${vaultPalette[tone].line || vaultPalette[tone].accent}`,
    borderRadius: 6,
    color: vaultPalette.slateLedger.text,
    height: 34,
  });

  const headerCellStyle = (key, align = 'left') => ({
    background: vaultPalette.slateLedger.surface,
    borderRight: `1px solid ${vaultPalette.slateLedger.line}`,
    borderBottom: `2px solid ${vaultPalette[columnTone[key]].line}`,
    color: vaultPalette[columnTone[key]].accent,
    cursor: 'pointer',
    padding: '10px 12px',
    textAlign: align,
    whiteSpace: 'nowrap',
  });

  const bodyCellStyle = (index, key, align = 'left') => ({
    ...alternateColumnStyles[index % alternateColumnStyles.length],
    borderRight: `1px solid ${vaultPalette.slateLedger.line}`,
    borderBottom: `1px solid ${vaultPalette.slateLedger.line}`,
    color:
      columnTone[key] === 'rupeeGreen'
        ? vaultPalette.rupeeGreen.strong
        : vaultPalette.slateLedger.text,
    padding: '10px 12px',
    textAlign: align,
  });

  const SortMark = ({ columnKey }) => (
    <span style={{ color: vaultPalette[columnTone[columnKey]].accent }}>
      {sortState.key === columnKey
        ? sortState.direction === 'asc'
          ? ' ↑'
          : ' ↓'
        : ' ↕'}
    </span>
  );

  return (
    <Card
      elevation={0}
      style={{
        marginTop: 16,
        background: vaultPalette.slateLedger.surface,
        border: `1px solid ${vaultPalette.slateLedger.line}`,
        padding: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: unhideTotalAmount
            ? 'repeat(3, minmax(0, 1fr))'
            : 'repeat(2, minmax(0, 1fr))',
          gap: 12,
          padding: 16,
          borderBottom: `1px solid ${vaultPalette.slateLedger.line}`,
        }}
      >
        <div
          style={{
            background: vaultPalette.slateLedger.mutedSurface,
            border: `1px solid ${vaultPalette.slateLedger.line}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div className={Classes.TEXT_MUTED}>Records shown</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {filteredExpenses.length}
          </div>
        </div>
        {unhideTotalAmount ? (
          <div
            style={{
              background: vaultPalette.rupeeGreen.surface,
              border: `1px solid ${vaultPalette.rupeeGreen.line}`,
              borderRadius: 8,
              padding: 14,
            }}
          >
            <div style={{ color: vaultPalette.rupeeGreen.accent }}>
              Total amount
            </div>
            <div
              style={{
                color: vaultPalette.rupeeGreen.strong,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {formatCurrency(totalExpenses)}
            </div>
          </div>
        ) : null}
        <div
          style={{
            background: vaultPalette.actionBlue.surface,
            border: `1px solid ${vaultPalette.actionBlue.line}`,
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ color: vaultPalette.actionBlue.accent }}>Selected</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{selectedCount}</div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '10px 12px',
          borderBottom: `1px solid ${vaultPalette.slateLedger.line}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <H3 style={{ margin: 0 }}>
            <T id="cash_vault.expenses" />
          </H3>
          <span className={Classes.TEXT_MUTED}>
            {filteredExpenses.length} results found
          </span>
          {activeFilterCount ? (
            <span style={{ color: vaultPalette.actionBlue.accent }}>
              {activeFilterCount} active filters
            </span>
          ) : null}
        </div>
        <Button
          intent={Intent.PRIMARY}
          onClick={() => onExportFilteredRows(sortedExpenses)}
          disabled={sortedExpenses.length === 0}
        >
          <T id="cash_vault.export" />
        </Button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '150px 210px minmax(220px, 1fr) auto',
          gap: 8,
          alignItems: 'end',
          padding: '10px 12px',
          borderBottom: `1px solid ${vaultPalette.slateLedger.line}`,
        }}
      >
        <FormGroup label={<T id="cash_vault.date" />} style={{ margin: 0 }}>
          <InputGroup
            type="date"
            value={filterValues.date}
            style={filterInputStyle(filterTone.date)}
            onChange={(event) => setFilterValue('date', event.target.value)}
          />
        </FormGroup>
        <FormGroup
          label={<T id="cash_vault.individual_identifier" />}
          style={{ margin: 0 }}
        >
          <InputGroup
            value={filterValues.individualIdentifier}
            style={filterInputStyle(filterTone.individualIdentifier)}
            onChange={(event) =>
              setFilterValue('individualIdentifier', event.target.value)
            }
          />
        </FormGroup>
        <FormGroup
          label={<T id="cash_vault.description" />}
          style={{ margin: 0 }}
        >
          <InputGroup
            value={filterValues.description}
            style={filterInputStyle(filterTone.description)}
            onChange={(event) =>
              setFilterValue('description', event.target.value)
            }
          />
        </FormGroup>
        <Button minimal intent={Intent.PRIMARY} onClick={clearFilters}>
          Clear all
        </Button>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 12,
          padding: '8px 12px',
          borderBottom: `1px solid ${vaultPalette.slateLedger.line}`,
          color: vaultPalette.slateLedger.accent,
          fontSize: 12,
        }}
      >
        <span>
          <span style={{ color: vaultPalette.actionBlue.accent }}>●</span>{' '}
          identity/date filters
        </span>
        <span>
          <span style={{ color: vaultPalette.rupeeGreen.accent }}>●</span>{' '}
          amount column
        </span>
        <span>
          <span style={{ color: vaultPalette.slateLedger.accent }}>●</span>{' '}
          text filter
        </span>
      </div>
      {isLoading ? (
        <div style={{ padding: 16 }}>
          <Spinner size={24} />
        </div>
      ) : (
        <>
          <HTMLTable
            interactive
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...bodyCellStyle(0, 'date'),
                    width: 36,
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={areVisibleRowsSelected}
                    onChange={toggleVisibleRowsSelection}
                  />
                </th>
                <th style={headerCellStyle('date')} onClick={() => toggleSort('date')}>
                  <T id="cash_vault.date" />
                  <SortMark columnKey="date" />
                </th>
                <th
                  style={headerCellStyle('individualIdentifier')}
                  onClick={() => toggleSort('individualIdentifier')}
                >
                  <T id="cash_vault.individual_identifier" />
                  <SortMark columnKey="individualIdentifier" />
                </th>
                <th
                  style={headerCellStyle('description')}
                  onClick={() => toggleSort('description')}
                >
                  <T id="cash_vault.description" />
                  <SortMark columnKey="description" />
                </th>
                <th
                  style={headerCellStyle('amount', 'right')}
                  onClick={() => toggleSort('amount')}
                >
                  <T id="cash_vault.amount_inr" />
                  <SortMark columnKey="amount" />
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedExpenses.map((expense, index) => {
                const rowId = getExpenseRowId(expense, pageStart + index);
                const isSelected = selectedExpenseIds.includes(rowId);
                return (
                  <tr
                    key={rowId}
                    style={{
                      outline: isSelected
                        ? `1px solid ${vaultPalette.actionBlue.line}`
                        : 'none',
                    }}
                  >
                    <td
                      style={{
                        ...bodyCellStyle(0, 'date'),
                        width: 36,
                        textAlign: 'center',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRowSelection(rowId)}
                      />
                    </td>
                    <td style={bodyCellStyle(1, 'date')}>
                      {getExpenseDate(expense) || '-'}
                    </td>
                    <td style={bodyCellStyle(2, 'individualIdentifier')}>
                      {getExpenseReference(expense) || '-'}
                    </td>
                    <td style={bodyCellStyle(3, 'description')}>
                      {getExpenseDescription(expense) || '-'}
                    </td>
                    <td style={bodyCellStyle(4, 'amount', 'right')}>
                      {getExpenseFormattedAmount(expense) ||
                        formatCurrency(
                          getExpenseTotalAmount(expense),
                          getExpenseCurrencyCode(expense),
                        )}
                    </td>
                  </tr>
                );
              })}
              {pagedExpenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 14,
                      borderBottom: `1px solid ${vaultPalette.slateLedger.line}`,
                    }}
                  >
                    <T id="cash_vault.no_expenses" />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </HTMLTable>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 12px',
              borderTop: `1px solid ${vaultPalette.slateLedger.line}`,
              color: vaultPalette.slateLedger.accent,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Results per page</span>
              <NumericInput
                min={1}
                max={100}
                value={pageSize}
                buttonPosition="none"
                style={{ width: 56 }}
                onValueChange={(value) => {
                  setCurrentPage(1);
                  setPageSize(Number(value) || 10);
                }}
              />
              <span>
                {sortedExpenses.length === 0 ? 0 : pageStart + 1} to{' '}
                {Math.min(pageStart + pageSize, sortedExpenses.length)} of{' '}
                {sortedExpenses.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button
                minimal
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                ‹
              </Button>
              <span>
                {safeCurrentPage} of {pageCount}
              </span>
              <Button
                minimal
                disabled={safeCurrentPage === pageCount}
                onClick={() =>
                  setCurrentPage((page) => Math.min(pageCount, page + 1))
                }
              >
                ›
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export function CashVaultScopedPage() {
  const organizationName = useCurrentOrganizationName();
  const exitVault = () => {
    window.location.replace('/');
  };

  return (
    <div
      className="cash-vault-scope"
      style={{
        minHeight: '100vh',
        background: '#151b22',
        color: '#f5f8fa',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <H2 style={{ margin: 0 }}>{organizationName}</H2>
        <Button minimal intent={Intent.PRIMARY} onDoubleClick={exitVault}>
          <T id="cash_vault.exit_scope" />
        </Button>
      </div>
      <CashVaultManagementPage />
    </div>
  );
}

export function CashVaultManagementPage() {
  const { data: accounts = [], isLoading } = useCashVaultAccounts();
  const { data: expensesResponse, isLoading: isExpensesLoading } =
    useCashVaultExpenses();
  const createExpense = useCreateCashVaultExpense();
  const [expenseValues, setExpenseValues] = useState(defaultExpenseValues);
  const [filterValues, setFilterValues] = useState(defaultFilterValues);

  const expenses = expensesResponse?.data || [];

  const setExpenseValue = (name, value) => {
    setExpenseValues((previous) => ({ ...previous, [name]: value }));
  };

  const setFilterValue = (name, value) => {
    setFilterValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleExportExpenses = async (rows) => {
    const exportRows = rows.map((expense) => ({
      date: getExpenseDate(expense) || '',
      individualIdentifier: getExpenseReference(expense) || '',
      description: getExpenseDescription(expense) || '',
      amount: Number(getExpenseTotalAmount(expense) || 0),
    }));
    const workbook = await writeXlsx({
      sheets: [
        {
          name: 'Expenses',
          columns: [
            { header: 'Date', key: 'date', width: 15 },
            {
              header: 'Individual_identifier',
              key: 'individualIdentifier',
              width: 24,
            },
            { header: 'Description', key: 'description', width: 40 },
            { header: 'Amount (INR)', key: 'amount', width: 14 },
          ],
          data: exportRows,
          freezePane: { rows: 1 },
          autoFilter: { range: `A1:D${Math.max(exportRows.length + 1, 1)}` },
        },
      ],
    });
    downloadFile(
      workbook,
      `vault-expenses-${new Date().toISOString().slice(0, 10)}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  };

  const handleCreateExpense = (event) => {
    event.preventDefault();
    createExpense.mutate(
      {
        paymentDate: expenseValues.paymentDate,
        description: expenseValues.description || undefined,
        referenceNo: expenseValues.referenceNo || undefined,
        categories: [
          {
            expenseAccountId: Number(expenseValues.expenseAccountId),
            amount: Number(expenseValues.amount),
            description: expenseValues.description || undefined,
          },
        ],
      },
      {
        onSuccess: () => {
          setExpenseValues(defaultExpenseValues);
        },
      },
    );
  };

  return (
      <div style={{ padding: 24 }}>
        <Card elevation={0}>
          {isLoading ? (
            <Spinner size={24} />
          ) : (
            <HTMLTable striped interactive style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>
                    <T id="cash_vault.account" />
                  </th>
                  <th>
                    <T id="cash_vault.entry_target" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{getLedgerDisplayName(account)}</td>
                    <td>
                      {account.cashVaultEntryEnabled ? (
                        <T id="yes" />
                      ) : (
                        <T id="no" />
                      )}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <T id="cash_vault.no_accounts" />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </HTMLTable>
          )}
        </Card>
        <Card elevation={0} style={{ marginTop: 16 }}>
          <H3>
            <T id="cash_vault.add_expense" />
          </H3>
          <form onSubmit={handleCreateExpense}>
            {createExpense.isError ? (
              <div className={Classes.INTENT_DANGER} style={{ marginBottom: 12 }}>
                {createExpense.error?.response?.data?.message ||
                  createExpense.error?.response?.data?.errors?.[0]?.message ||
                  createExpense.error?.message ||
                  'Expense could not be saved.'}
              </div>
            ) : null}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              <FormGroup label={<T id="cash_vault.date" />}>
                <InputGroup
                  type="date"
                  value={expenseValues.paymentDate}
                  onChange={(event) =>
                    setExpenseValue('paymentDate', event.target.value)
                  }
                />
              </FormGroup>
              <FormGroup label={<T id="cash_vault.expense_account_id" />}>
                <NumericInput
                  fill
                  min={1}
                  value={expenseValues.expenseAccountId}
                  onValueChange={(value) =>
                    setExpenseValue('expenseAccountId', value)
                  }
                />
              </FormGroup>
              <FormGroup label={<T id="cash_vault.amount_inr" />}>
                <NumericInput
                  fill
                  min={0.01}
                  value={expenseValues.amount}
                  onValueChange={(value) => setExpenseValue('amount', value)}
                />
              </FormGroup>
              <FormGroup label={<T id="cash_vault.individual_identifier" />}>
                <InputGroup
                  value={expenseValues.referenceNo}
                  onChange={(event) =>
                    setExpenseValue('referenceNo', event.target.value)
                  }
                />
              </FormGroup>
            </div>
            <FormGroup label={<T id="cash_vault.description" />}>
              <InputGroup
                value={expenseValues.description}
                onChange={(event) =>
                  setExpenseValue('description', event.target.value)
                }
              />
            </FormGroup>
            <Button
              intent={Intent.PRIMARY}
              type="submit"
              loading={createExpense.isLoading}
            >
              <T id="cash_vault.save_expense" />
            </Button>
          </form>
        </Card>
        <CashVaultExpenseLedgerTable
          expenses={expenses}
          isLoading={isExpensesLoading}
          filterValues={filterValues}
          onFilterValueChange={setFilterValue}
          onClearFilters={() => setFilterValues(defaultFilterValues)}
          onExportFilteredRows={handleExportExpenses}
        />
      </div>
  );
}
