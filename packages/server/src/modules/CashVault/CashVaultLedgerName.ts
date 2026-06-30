export function getCashVaultLedgerName(seed: string | number) {
  const value = String(seed || 'cash-vault');
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const number = 100000 + (Math.abs(hash) % 900000);
  return `TEST_LEDGER_${number}`;
}
