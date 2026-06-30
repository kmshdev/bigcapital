import {
  BOOTSTRAP_BUSINESSES,
  BOOTSTRAP_USERS,
} from './LocalBookeepzBootstrap.command';
import { ReadinessFailure } from './BookeepzReadinessEnv';

type FetchLike = typeof fetch;

function apiFailure(
  target: string,
  message: string,
  failureClass: ReadinessFailure['class'] = 'access_policy_mismatch',
): ReadinessFailure {
  return {
    class: failureClass,
    operation: 'api.probe',
    target,
    message,
  };
}

async function readJson(response: any) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function runBookeepzApiProbes(input: {
  baseUrl: string;
  passwords: {
    loginPasswords: Record<string, string | undefined>;
    cashVaultPasswords: Record<string, string | undefined>;
  };
  fetchImpl?: FetchLike;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;
  const baseUrl = input.baseUrl.replace(/\/$/, '');
  const failures: ReadinessFailure[] = [];
  const users: Record<string, any> = {};

  for (const user of BOOTSTRAP_USERS) {
    const email = user.email;
    const signin = await fetchImpl(`${baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: input.passwords.loginPasswords[email],
      }),
    } as any);
    const signinBody = await readJson(signin);
    if (!signin.ok || !signinBody.accessToken) {
      failures.push(
        apiFailure(email, `Signin failed with status ${signin.status}.`),
      );
      continue;
    }

    users[email] = {
      signedIn: true,
      organizationId: signinBody.organizationId,
      tenantId: signinBody.tenantId,
      userId: signinBody.userId,
    };

    for (const purpose of ['entry', 'manage'] as const) {
      const challenge = await fetchImpl(`${baseUrl}/api/cash-vault/challenge`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${signinBody.accessToken}`,
          'organization-id': signinBody.organizationId,
          'x-test-user': email,
        },
        body: JSON.stringify({
          password: input.passwords.cashVaultPasswords[email],
          purpose,
        }),
      } as any);
      const challengeBody = await readJson(challenge);
      const target = `${email}:${purpose}`;
      if (email === 'acca0@bookeepz.net' && purpose === 'manage') {
        if (
          challenge.status !== 403 ||
          challengeBody.message !== 'cash_vault_unlock_user_not_designated'
        ) {
          failures.push(
            apiFailure(
              target,
              'Accountant manage challenge must fail as non-designated admin.',
            ),
          );
        }
      } else if (!challenge.ok) {
        failures.push(
          apiFailure(
            target,
            `Cash Vault challenge failed with status ${challenge.status}.`,
          ),
        );
      }
    }

    if (email === 'adminF0@bookeepz.net') {
      for (const business of BOOTSTRAP_BUSINESSES) {
        const balanceSheet = await fetchImpl(
          `${baseUrl}/api/reports/balance-sheet?fromDate=2026-04-01&toDate=2026-06-30`,
          {
            method: 'GET',
            headers: {
              authorization: `Bearer ${signinBody.accessToken}`,
              'organization-id': business.organizationId,
              accept: 'application/json',
            },
          } as any,
        );
        if (!balanceSheet.ok) {
          failures.push(
            apiFailure(
              `${business.organizationId}:balance-sheet`,
              `Balance Sheet failed with status ${balanceSheet.status}.`,
              'report_regression',
            ),
          );
        }
      }
    }
  }

  return { failures, users };
}
