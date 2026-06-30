// @ts-nocheck
import React, { useState } from 'react';
import {
  Button,
  Classes,
  DialogBody,
  DialogFooter,
  FormGroup,
  InputGroup,
  Intent,
} from '@blueprintjs/core';
import { Dialog, DialogSuspense, FormattedMessage as T } from '@/components';
import withDialogRedux from '@/components/DialogReduxConnect';
import { compose } from '@/utils';
import { DialogsName } from '@/constants/dialogs';
import { withDialogActions } from '@/containers/Dialog/withDialogActions';
import { AppToaster } from '@/components';
import { useVerifyCashVaultChallenge } from './hooks';
import { navigateToCashVaultScope } from './routes';

function CashVaultChallengeDialogContentInner({
  dialogName,
  payload,
  closeDialog,
  openDialog,
}) {
  const [password, setPassword] = useState('');
  const purpose = payload?.purpose || 'entry';
  const verifyChallenge = useVerifyCashVaultChallenge();

  const handleSubmit = (event) => {
    event.preventDefault();
    verifyChallenge.mutate(
      { password, purpose },
      {
        onSuccess: () => {
          closeDialog(dialogName);
          setPassword('');
          if (purpose === 'entry') {
            openDialog(DialogsName.CashVaultEntry);
          } else {
            navigateToCashVaultScope();
          }
        },
        onError: () => {
          AppToaster.show({
            message: 'Cash Vault password was not accepted.',
            intent: Intent.DANGER,
          });
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogBody>
        <FormGroup label={<T id={'cash_vault.challenge_password'} />}>
          <InputGroup
            type={'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
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
              loading={verifyChallenge.isLoading}
            >
              <T id={'cash_vault.unlock'} />
            </Button>
          </>
        }
      />
    </form>
  );
}

const CashVaultChallengeDialogContent = compose(withDialogActions)(
  CashVaultChallengeDialogContentInner,
);

function CashVaultChallengeDialogInner({ dialogName, isOpen, payload }) {
  return (
    <Dialog
      name={dialogName}
      title={<T id={'cash_vault.challenge.title'} />}
      isOpen={isOpen}
      autoFocus={true}
      style={{ width: '420px' }}
    >
      <DialogSuspense>
        <CashVaultChallengeDialogContent
          dialogName={dialogName}
          payload={payload}
        />
      </DialogSuspense>
    </Dialog>
  );
}

export const CashVaultChallengeDialog = compose(withDialogRedux())(
  CashVaultChallengeDialogInner,
);
