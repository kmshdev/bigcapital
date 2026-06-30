import { runBookeepzApiProbes } from './BookeepzReadinessApi';

describe('BookeepzReadinessApi', () => {
  it('probes signin, Cash Vault challenge split, and Balance Sheet without returning tokens', async () => {
    const calls: Array<{ url: string; body?: any; headers?: any }> = [];
    const fetchImpl = jest.fn(async (url: string, init: any = {}) => {
      calls.push({
        url,
        body: init.body ? JSON.parse(init.body) : undefined,
        headers: init.headers,
      });
      if (url.endsWith('/api/auth/signin')) {
        return jsonResponse(200, {
          accessToken: 'secret-token',
          organizationId: 'risingstone_infra_pvt_ltd',
          tenantId: 1,
          userId: 10,
        });
      }
      if (url.endsWith('/api/cash-vault/challenge')) {
        const body = JSON.parse(init.body);
        if (
          body.purpose === 'manage' &&
          init.headers['x-test-user'] === 'acca0@bookeepz.net'
        ) {
          return jsonResponse(403, {
            message: 'cash_vault_unlock_user_not_designated',
          });
        }
        return jsonResponse(201, { granted: true, purpose: body.purpose });
      }
      if (url.includes('/api/reports/balance-sheet')) {
        return jsonResponse(200, { data: [], meta: {} });
      }
      return jsonResponse(404, {});
    });

    const result = await runBookeepzApiProbes({
      baseUrl: 'http://127.0.0.1',
      fetchImpl: fetchImpl as any,
      passwords: {
        loginPasswords: {
          'adminF0@bookeepz.net': 'login-0',
          'adminF1@bookeepz.net': 'login-1',
          'acca0@bookeepz.net': 'login-2',
        },
        cashVaultPasswords: {
          'adminF0@bookeepz.net': 'cash-0',
          'adminF1@bookeepz.net': 'cash-1',
          'acca0@bookeepz.net': 'cash-2',
        },
      },
    });

    expect(result.failures).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('secret-token');
    expect(
      calls.some((call) => call.url.includes('/api/reports/balance-sheet')),
    ).toBe(true);
  });
});

function jsonResponse(status: number, payload: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  };
}
