// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useApiRequest from '@/hooks/useRequest';

const cashVaultKeys = {
  accounts: ['cash-vault', 'accounts'],
  entries: ['cash-vault', 'entries'],
  expenses: ['cash-vault', 'expenses'],
  designatedAdmins: ['cash-vault', 'designated-admins'],
};

const cashVaultManageScope = {
  headers: { 'x-cash-vault-scope': 'manage' },
};

const cashVaultEntryScope = {
  headers: { 'x-cash-vault-scope': 'entry' },
};

export function useCashVaultAccounts(props) {
  const request = useApiRequest();
  return useQuery({
    ...props,
    queryKey: cashVaultKeys.accounts,
    queryFn: () =>
      request
        .get('/cash-vault/accounts', cashVaultManageScope)
        .then((res) => res.data),
  });
}

export function useDesignateCashVaultAccount(props) {
  const queryClient = useQueryClient();
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request
        .post('/cash-vault/accounts', values, cashVaultManageScope)
        .then((res) => res.data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: cashVaultKeys.accounts });
      props?.onSuccess?.(...args);
    },
  });
}

export function useRemoveCashVaultDesignation(props) {
  const queryClient = useQueryClient();
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (accountId) =>
      request
        .delete(`/cash-vault/accounts/${accountId}`, cashVaultManageScope)
        .then((res) => res.data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: cashVaultKeys.accounts });
      props?.onSuccess?.(...args);
    },
  });
}

export function useCreateCashVaultEntry(props) {
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request
        .post('/cash-vault/entries', values, cashVaultEntryScope)
        .then((res) => res.data),
  });
}

export function useCashVaultExpenses(props) {
  const request = useApiRequest();
  return useQuery({
    ...props,
    queryKey: cashVaultKeys.expenses,
    queryFn: () =>
      request
        .get('/cash-vault/expenses', cashVaultManageScope)
        .then((res) => res.data),
  });
}

export function useCreateCashVaultExpense(props) {
  const queryClient = useQueryClient();
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request
        .post('/cash-vault/expenses', values, cashVaultEntryScope)
        .then((res) => res.data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: cashVaultKeys.expenses });
      props?.onSuccess?.(...args);
    },
  });
}

export function useVerifyCashVaultChallenge(props) {
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request.post('/cash-vault/challenge', values).then((res) => res.data),
  });
}

export function useCashVaultDesignatedAdmins(props) {
  const request = useApiRequest();
  return useQuery({
    ...props,
    queryKey: cashVaultKeys.designatedAdmins,
    queryFn: () =>
      request
        .get('/cash-vault/designated-admins', cashVaultManageScope)
        .then((res) => res.data),
  });
}

export function useReplaceCashVaultDesignatedAdmins(props) {
  const queryClient = useQueryClient();
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request
        .post('/cash-vault/designated-admins', values, cashVaultManageScope)
        .then((res) => res.data),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        queryKey: cashVaultKeys.designatedAdmins,
      });
      props?.onSuccess?.(...args);
    },
  });
}

export function useGrantCashVaultUnlock(props) {
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request
        .post('/cash-vault/unlocks', values, cashVaultManageScope)
        .then((res) => res.data),
  });
}

export function useRevokeCashVaultUnlock(props) {
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: ({ unlockId }) =>
      request
        .delete(`/cash-vault/unlocks/${unlockId}`, cashVaultManageScope)
        .then((res) => res.data),
  });
}
