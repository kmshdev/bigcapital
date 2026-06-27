// @ts-nocheck
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useApiRequest from '@/hooks/useRequest';

const cashVaultKeys = {
  accounts: ['cash-vault', 'accounts'],
  entries: ['cash-vault', 'entries'],
  designatedAdmins: ['cash-vault', 'designated-admins'],
};

export function useCashVaultAccounts(props) {
  const request = useApiRequest();
  return useQuery({
    ...props,
    queryKey: cashVaultKeys.accounts,
    queryFn: () => request.get('/cash-vault/accounts').then((res) => res.data),
  });
}

export function useDesignateCashVaultAccount(props) {
  const queryClient = useQueryClient();
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request.post('/cash-vault/accounts', values).then((res) => res.data),
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
        .delete(`/cash-vault/accounts/${accountId}`)
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
      request.post('/cash-vault/entries', values).then((res) => res.data),
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
      request.get('/cash-vault/designated-admins').then((res) => res.data),
  });
}

export function useReplaceCashVaultDesignatedAdmins(props) {
  const queryClient = useQueryClient();
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: (values) =>
      request
        .post('/cash-vault/designated-admins', values)
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
      request.post('/cash-vault/unlocks', values).then((res) => res.data),
  });
}

export function useRevokeCashVaultUnlock(props) {
  const request = useApiRequest();
  return useMutation({
    ...props,
    mutationFn: ({ unlockId, revokedByUserId }) =>
      request
        .delete(`/cash-vault/unlocks/${unlockId}`, {
          data: { revokedByUserId },
        })
        .then((res) => res.data),
  });
}
