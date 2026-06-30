import {
  checkRuntimeFreshness,
  RuntimeCommandRunner,
} from './BookeepzReadinessRuntime';

describe('BookeepzReadinessRuntime', () => {
  it('passes when source and container markers contain current readiness fixes', async () => {
    const runner: RuntimeCommandRunner = async (command, args) => {
      const joined = [command, ...args].join(' ');
      if (joined.includes('bigcapital-server')) {
        return {
          ok: true,
          stdout: [
            'cash_vault_unlock_user_not_designated',
            'cash_vault_challenge_invalid',
            'ACCOUNT_PARENT_TYPE.INCOME) ?? []',
            'ACCOUNT_PARENT_TYPE.EXPENSE) ?? []',
          ].join('\n'),
          stderr: '',
        };
      }
      if (joined.includes('bigcapital-webapp')) {
        return {
          ok: true,
          stdout:
            'Cash Vault management access is limited to the two designated admins.',
          stderr: '',
        };
      }
      return { ok: true, stdout: 'running', stderr: '' };
    };

    const result = await checkRuntimeFreshness({ runner });

    expect(result.failures).toEqual([]);
    expect(result.markers.server.challengeSplit).toBe(true);
    expect(result.markers.server.balanceSheetGuard).toBe(true);
    expect(result.markers.webapp.challengeMessageSplit).toBe(true);
  });

  it('reports runtime_stale when compiled server code does not contain the Balance Sheet guard', async () => {
    const runner: RuntimeCommandRunner = async () => ({
      ok: true,
      stdout: 'incomeAccounts.map((a) => a.id)',
      stderr: '',
    });

    const result = await checkRuntimeFreshness({ runner });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: 'runtime_stale',
          target: 'bigcapital-server:BalanceSheetRepositoryNetIncome',
        }),
      ]),
    );
  });
});
