// U+FFFC OBJECT REPLACEMENT CHARACTER.
export const CASH_VAULT_ROUTE = '/\uFFFC';

export function navigateToCashVaultScope() {
  window.location.replace(CASH_VAULT_ROUTE);
}
