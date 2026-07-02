// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Classes,
  DialogBody,
  DialogFooter,
  FormGroup,
  HTMLSelect,
  InputGroup,
  Intent,
  NumericInput,
} from '@blueprintjs/core';
import intl from 'react-intl-universal';
import {
  AccountsSuggestField,
  Dialog,
  DialogSuspense,
  FormattedMessage as T,
} from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { AppToaster } from '@/components';
import { compose, nestedArrayToflatten } from '@/utils';
import { ACCOUNT_TYPE } from '@/constants/accountTypes';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { useAccounts } from '@/hooks/query';
import { useCreateCashVaultEntry } from './hooks';

const defaultValues = {
  transactionType: 'deposit',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: '',
  referenceNo: '',
  offsetAccountId: '',
};

const isCashVaultAccount = (account) =>
  account?.isCashVault || account?.is_cash_vault || account?.cashVault;

const getAccountCode = (account) => String(account?.code || '').toUpperCase();

const getDefaultOffsetAccountId = (accounts) => {
  const activeAccounts = accounts.filter(
    (account) => !isCashVaultAccount(account),
  );
  const paymentAccount = activeAccounts.find(
    (account) => getAccountCode(account) === 'PAYMAIN01',
  );
  const bankOrCashAccount = activeAccounts.find((account) =>
    [ACCOUNT_TYPE.BANK, ACCOUNT_TYPE.CASH].includes(account?.accountType),
  );

  return (
    paymentAccount?.id || bankOrCashAccount?.id || activeAccounts[0]?.id || ''
  );
};

function CashVaultEntryDialogContentInner({ dialogName, closeDialog }) {
  const [values, setValues] = useState(defaultValues);
  const { data: accounts = [], isLoading: isAccountsLoading } = useAccounts();
  const createEntry = useCreateCashVaultEntry();

  const setValue = (name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  const ledgerAccounts = useMemo(
    () =>
      nestedArrayToflatten(accounts).filter(
        (account) => !isCashVaultAccount(account),
      ),
    [accounts],
  );
  const defaultOffsetAccountId = useMemo(
    () => getDefaultOffsetAccountId(ledgerAccounts),
    [ledgerAccounts],
  );

  useEffect(() => {
    if (!values.offsetAccountId && defaultOffsetAccountId) {
      setValue('offsetAccountId', defaultOffsetAccountId);
    }
  }, [defaultOffsetAccountId, values.offsetAccountId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!values.offsetAccountId) {
      AppToaster.show({
        message: intl.get('cash_vault.offset_account_required'),
        intent: Intent.DANGER,
      });
      return;
    }
    createEntry.mutate(
      {
        ...values,
        amount: Number(values.amount),
        offsetAccountId: Number(values.offsetAccountId),
        referenceNo: values.referenceNo || undefined,
      },
      {
        onSuccess: () => {
          AppToaster.show({
            message: intl.get('cash_vault.entry_saved'),
            intent: Intent.SUCCESS,
          });
          closeDialog(dialogName);
          setValues(defaultValues);
          window.location.replace('/');
        },
        onError: () => {
          AppToaster.show({
            message: intl.get('cash_vault.entry_failed'),
            intent: Intent.DANGER,
          });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogBody>
        <FormGroup label={<T id={'cash_vault.entry_type'} />}>
          <HTMLSelect
            fill
            value={values.transactionType}
            onChange={(event) => setValue('transactionType', event.target.value)}
            options={[
              { value: 'deposit', label: intl.get('cash_vault.deposit') },
              {
                value: 'withdrawal',
                label: intl.get('cash_vault.withdrawal'),
              },
            ]}
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.amount_inr'} />}>
          <NumericInput
            fill
            min={0.01}
            value={values.amount}
            onValueChange={(amount) => setValue('amount', amount)}
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.date'} />}>
          <InputGroup
            type={'date'}
            value={values.date}
            onChange={(event) => setValue('date', event.target.value)}
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.individual_identifier'} />}>
          <InputGroup
            value={values.referenceNo}
            onChange={(event) => setValue('referenceNo', event.target.value)}
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.description'} />}>
          <InputGroup
            value={values.description}
            onChange={(event) => setValue('description', event.target.value)}
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.offset_ledger_account'} />}>
          <AccountsSuggestField
            items={ledgerAccounts}
            selectedValue={values.offsetAccountId}
            onItemSelect={(account) => setValue('offsetAccountId', account.id)}
            filterByTypes={[
              ACCOUNT_TYPE.CASH,
              ACCOUNT_TYPE.BANK,
              ACCOUNT_TYPE.OTHER_CURRENT_ASSET,
              ACCOUNT_TYPE.EQUITY,
              ACCOUNT_TYPE.INCOME,
              ACCOUNT_TYPE.OTHER_INCOME,
              ACCOUNT_TYPE.EXPENSE,
              ACCOUNT_TYPE.OTHER_EXPENSE,
            ]}
            inputProps={{
              placeholder: intl.get('cash_vault.select_offset_ledger_account'),
            }}
            disabled={isAccountsLoading}
          />
        </FormGroup>
      </DialogBody>
      <DialogFooter
        actions={
          <>
            <Button
              className={Classes.MINIMAL}
              onClick={() => closeDialog(dialogName)}
            >
              <T id={'cancel'} />
            </Button>
            <Button
              intent={Intent.PRIMARY}
              type={'submit'}
              loading={createEntry.isLoading}
            >
              <T id={'cash_vault.save_entry'} />
            </Button>
          </>
        }
      />
    </form>
  );
}

const CashVaultEntryDialogContent = compose(withDialogActions)(
  CashVaultEntryDialogContentInner,
);

function CashVaultEntryDialogInner({ dialogName, isOpen }) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'cash_vault.entry_dialog.title'} />}
      isOpen={isOpen}
      autoFocus={true}
      style={{ width: '460px' }}
    >
      <DialogSuspense>
        <CashVaultEntryDialogContent dialogName={dialogName} />
      </DialogSuspense>
    </Dialog>
  );
}

export const CashVaultEntryDialog = compose(withDialogRedux())(
  CashVaultEntryDialogInner,
);
