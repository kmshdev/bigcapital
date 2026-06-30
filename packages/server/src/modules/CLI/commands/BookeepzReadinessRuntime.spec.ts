import {
  checkContainerRuntimeFreshness,
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

  it('passes from the server container using local server files and fetched webapp assets', async () => {
    const runner: RuntimeCommandRunner = async () => ({
      ok: true,
      stdout: [
        'cash_vault_unlock_user_not_designated',
        'cash_vault_challenge_invalid',
        'ACCOUNT_PARENT_TYPE.INCOME) ?? []',
        'ACCOUNT_PARENT_TYPE.EXPENSE) ?? []',
      ].join('\n'),
      stderr: '',
    });
    const fetchImpl = jest.fn(async (url: string) => {
      if (url === 'http://proxy') {
        return textResponse(
          200,
          '<script type="module" src="/assets/app.js"></script>',
        );
      }
      if (url === 'http://proxy/assets/app.js') {
        return textResponse(
          200,
          'Cash Vault management access is limited to the two designated admins.',
        );
      }
      return textResponse(404, '');
    });

    const result = await checkContainerRuntimeFreshness({
      runner,
      fetchImpl: fetchImpl as any,
      webappBaseUrl: 'http://proxy',
    });

    expect(result.failures).toEqual([]);
    expect(result.markers.server.challengeSplit).toBe(true);
    expect(result.markers.server.balanceSheetGuard).toBe(true);
    expect(result.markers.webapp.challengeMessageSplit).toBe(true);
  });

  it('uses a supplied webapp marker when the setup wrapper checked the webapp container', async () => {
    const runner: RuntimeCommandRunner = async () => ({
      ok: true,
      stdout: [
        'cash_vault_unlock_user_not_designated',
        'cash_vault_challenge_invalid',
        'ACCOUNT_PARENT_TYPE.INCOME) ?? []',
        'ACCOUNT_PARENT_TYPE.EXPENSE) ?? []',
      ].join('\n'),
      stderr: '',
    });

    const result = await checkContainerRuntimeFreshness({
      runner,
      webappMarkerOutput:
        'Cash Vault management access is limited to the two designated admins.',
    });

    expect(result.failures).toEqual([]);
    expect(result.markers.webapp.challengeMessageSplit).toBe(true);
  });
});

function textResponse(status: number, body: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}
