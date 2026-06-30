// @ts-nocheck
import React, { useState } from 'react';
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
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { AppToaster } from '@/components';
import { compose } from '@/utils';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { useCreateCashVaultEntry } from './hooks';

const defaultValues = {
  transactionType: 'deposit',
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  description: '',
  referenceNo: '',
  offsetAccountId: '',
};

function CashVaultEntryDialogContentInner({ dialogName, closeDialog }) {
  const [values, setValues] = useState(defaultValues);
  const createEntry = useCreateCashVaultEntry();

  const setValue = (name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
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
        <FormGroup label={<T id={'cash_vault.description'} />}>
          <InputGroup
            value={values.description}
            onChange={(event) => setValue('description', event.target.value)}
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.offset_account_id'} />}>
          <NumericInput
            fill
            min={1}
            value={values.offsetAccountId}
            onValueChange={(offsetAccountId) =>
              setValue('offsetAccountId', offsetAccountId)
            }
          />
        </FormGroup>
        <FormGroup label={<T id={'cash_vault.reference'} />}>
          <InputGroup
            value={values.referenceNo}
            onChange={(event) => setValue('referenceNo', event.target.value)}
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
