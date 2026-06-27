// @ts-nocheck
import React, { useState } from 'react';
import {
  Button,
  Card,
  FormGroup,
  H2,
  H3,
  HTMLTable,
  InputGroup,
  Intent,
  NumericInput,
  Spinner,
} from '@blueprintjs/core';
import { DashboardInsider, FormattedMessage as T } from '@/components';
import {
  useCashVaultAccounts,
  useCashVaultDesignatedAdmins,
  useGrantCashVaultUnlock,
  useRemoveCashVaultDesignation,
  useReplaceCashVaultDesignatedAdmins,
  useRevokeCashVaultUnlock,
} from './hooks';

export function CashVaultManagementPage() {
  const { data: accounts = [], isLoading } = useCashVaultAccounts();
  const { data: designatedAdmins = [] } = useCashVaultDesignatedAdmins();
  const { mutate: removeDesignation, isLoading: isRemoving } =
    useRemoveCashVaultDesignation();
  const replaceDesignatedAdmins = useReplaceCashVaultDesignatedAdmins();
  const grantUnlock = useGrantCashVaultUnlock();
  const revokeUnlock = useRevokeCashVaultUnlock();
  const [adminIds, setAdminIds] = useState('');
  const [unlockUserId, setUnlockUserId] = useState('');
  const [unlockExpiresAt, setUnlockExpiresAt] = useState('');
  const [unlockGrantedByUserId, setUnlockGrantedByUserId] = useState('');
  const [revokeUnlockId, setRevokeUnlockId] = useState('');
  const [revokeByUserId, setRevokeByUserId] = useState('');

  const handleReplaceAdmins = () => {
    replaceDesignatedAdmins.mutate({
      userIds: adminIds
        .split(',')
        .map((value) => Number(value.trim()))
        .filter(Boolean),
      designatedByUserId: Number(unlockGrantedByUserId || revokeByUserId),
    });
  };

  const handleGrantUnlock = () => {
    grantUnlock.mutate({
      userId: Number(unlockUserId),
      grantedByUserId: Number(unlockGrantedByUserId),
      expiresAt: unlockExpiresAt,
    });
  };

  const handleRevokeUnlock = () => {
    revokeUnlock.mutate({
      unlockId: Number(revokeUnlockId),
      revokedByUserId: Number(revokeByUserId),
    });
  };

  return (
    <DashboardInsider name="cash-vault-management">
      <div style={{ padding: 24 }}>
        <H2>
          <T id="cash_vault.management.title" />
        </H2>
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
                  <th />
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.name}</td>
                    <td>
                      {account.cashVaultEntryEnabled ? (
                        <T id="yes" />
                      ) : (
                        <T id="no" />
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        small
                        intent={Intent.DANGER}
                        loading={isRemoving}
                        onClick={() => removeDesignation(account.id)}
                      >
                        <T id="cash_vault.remove_designation" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
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
            <T id="cash_vault.designated_admins" />
          </H3>
          <FormGroup label={<T id="cash_vault.designated_admin_ids" />}>
            <InputGroup
              value={adminIds}
              onChange={(event) => setAdminIds(event.target.value)}
            />
          </FormGroup>
          <Button
            intent={Intent.PRIMARY}
            loading={replaceDesignatedAdmins.isLoading}
            onClick={handleReplaceAdmins}
          >
            <T id="cash_vault.save_designated_admins" />
          </Button>
          <div style={{ marginTop: 12 }}>
            {designatedAdmins.map((admin) => (
              <span key={admin.id || admin.userId} style={{ marginRight: 8 }}>
                #{admin.userId}
              </span>
            ))}
          </div>
        </Card>
        <Card elevation={0} style={{ marginTop: 16 }}>
          <H3>
            <T id="cash_vault.temporary_unlock" />
          </H3>
          <FormGroup label={<T id="cash_vault.unlock_user_id" />}>
            <NumericInput
              fill
              value={unlockUserId}
              onValueChange={(value) => setUnlockUserId(value)}
            />
          </FormGroup>
          <FormGroup label={<T id="cash_vault.unlock_expires_at" />}>
            <InputGroup
              type="datetime-local"
              value={unlockExpiresAt}
              onChange={(event) => setUnlockExpiresAt(event.target.value)}
            />
          </FormGroup>
          <FormGroup label={<T id="cash_vault.action_user_id" />}>
            <NumericInput
              fill
              value={unlockGrantedByUserId}
              onValueChange={(value) => setUnlockGrantedByUserId(value)}
            />
          </FormGroup>
          <Button
            intent={Intent.PRIMARY}
            loading={grantUnlock.isLoading}
            onClick={handleGrantUnlock}
          >
            <T id="cash_vault.grant_unlock" />
          </Button>
          <FormGroup
            label={<T id="cash_vault.revoke_unlock_id" />}
            style={{ marginTop: 16 }}
          >
            <NumericInput
              fill
              value={revokeUnlockId}
              onValueChange={(value) => setRevokeUnlockId(value)}
            />
          </FormGroup>
          <FormGroup label={<T id="cash_vault.action_user_id" />}>
            <NumericInput
              fill
              value={revokeByUserId}
              onValueChange={(value) => setRevokeByUserId(value)}
            />
          </FormGroup>
          <Button
            intent={Intent.DANGER}
            loading={revokeUnlock.isLoading}
            onClick={handleRevokeUnlock}
          >
            <T id="cash_vault.revoke_unlock" />
          </Button>
        </Card>
      </div>
    </DashboardInsider>
  );
}
