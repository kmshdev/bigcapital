// @ts-nocheck
import { FastField } from 'formik';
import React from 'react';
import { ExpenseFormEntriesTable } from './ExpenseFormEntriesTable';
import { useExpenseFormContext } from './ExpenseFormPageProvider';
import { makeDefaultExpenseEntry, accountsFieldShouldUpdate } from './utils';

/**
 * Expense form entries field.
 */
export function ExpenseFormEntriesField({ linesNumber = 4 }) {
  // Expense form context.
  const { accounts, projects } = useExpenseFormContext();
  const defaultEntry = React.useMemo(
    () => makeDefaultExpenseEntry(accounts),
    [accounts],
  );

  return (
    <FastField
      name={'categories'}
      accounts={accounts}
      projects={projects}
      shouldUpdate={accountsFieldShouldUpdate}
    >
      {({
        form: { values, setFieldValue },
        field: { value },
        meta: { error, touched },
      }) => (
        <ExpenseFormEntriesTable
          entries={value}
          error={error}
          onChange={(entries) => {
            setFieldValue('categories', entries);
          }}
          defaultEntry={defaultEntry}
          linesNumber={linesNumber}
          currencyCode={values.currency_code}
        />
      )}
    </FastField>
  );
}
