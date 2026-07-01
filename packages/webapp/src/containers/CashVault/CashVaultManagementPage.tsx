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
  const totalExpenses = filteredExpenses.reduce(
    (total, expense) => total + Number(getExpenseTotalAmount(expense) || 0),
    0,
  );

  const setExpenseValue = (name, value) => {
    setExpenseValues((previous) => ({ ...previous, [name]: value }));
  };

  const setFilterValue = (name, value) => {
    setFilterValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleExportExpenses = async () => {
    const rows = filteredExpenses.map((expense) => ({
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
          data: rows,
          freezePane: { rows: 1 },
          autoFilter: { range: `A1:D${Math.max(rows.length + 1, 1)}` },
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
        <Card elevation={0} style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <H3 style={{ margin: 0 }}>
              <T id="cash_vault.expenses" />
            </H3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={Classes.TEXT_MUTED}>
                <T id="cash_vault.total_expenses" />:{' '}
                {formatCurrency(totalExpenses)}
              </span>
              <Button
                intent={Intent.PRIMARY}
                onClick={handleExportExpenses}
                disabled={filteredExpenses.length === 0}
              >
                <T id="cash_vault.export" />
              </Button>
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 16,
              marginBottom: 12,
            }}
          >
            <FormGroup label={<T id="cash_vault.date" />}>
              <InputGroup
                type="date"
                value={filterValues.date}
                onChange={(event) => setFilterValue('date', event.target.value)}
              />
            </FormGroup>
            <FormGroup label={<T id="cash_vault.individual_identifier" />}>
              <InputGroup
                value={filterValues.individualIdentifier}
                onChange={(event) =>
                  setFilterValue('individualIdentifier', event.target.value)
                }
              />
            </FormGroup>
            <FormGroup label={<T id="cash_vault.description" />}>
              <InputGroup
                value={filterValues.description}
                onChange={(event) =>
                  setFilterValue('description', event.target.value)
                }
              />
            </FormGroup>
          </div>
          {isExpensesLoading ? (
            <Spinner size={24} />
          ) : (
            <HTMLTable striped interactive style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>
                    <T id="cash_vault.date" />
                  </th>
                  <th>
                    <T id="cash_vault.individual_identifier" />
                  </th>
                  <th>
                    <T id="cash_vault.description" />
                  </th>
                  <th style={{ textAlign: 'right' }}>
                    <T id="cash_vault.amount_inr" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{getExpenseDate(expense) || '-'}</td>
                    <td>{getExpenseReference(expense) || '-'}</td>
                    <td>{getExpenseDescription(expense) || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {getExpenseFormattedAmount(expense) ||
                        formatCurrency(
                          getExpenseTotalAmount(expense),
                          getExpenseCurrencyCode(expense),
                        )}
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <T id="cash_vault.no_expenses" />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </HTMLTable>
          )}
        </Card>
      </div>
  );
}
