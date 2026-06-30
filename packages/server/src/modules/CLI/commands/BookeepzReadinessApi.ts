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

function formatRequestError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function requestJson(input: {
  fetchImpl: FetchLike;
  url: string;
  init: any;
  target: string;
}) {
  try {
    const response = await input.fetchImpl(input.url, input.init);
    return {
      response,
      body: await readJson(response),
      failure: undefined,
    };
  } catch (error) {
    return {
      response: undefined,
      body: {},
      failure: apiFailure(
        input.target,
        `API request failed: ${formatRequestError(error)}.`,
        'api_unreachable',
      ),
    };
  }
}

function getSigninSession(body: any) {
  return {
    accessToken: body.accessToken ?? body.access_token,
    organizationId: body.organizationId ?? body.organization_id,
    tenantId: body.tenantId ?? body.tenant_id,
    userId: body.userId ?? body.user_id,
  };
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
    const signinResult = await requestJson({
      fetchImpl,
      url: `${baseUrl}/api/auth/signin`,
      target: email,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          password: input.passwords.loginPasswords[email],
        }),
      } as any,
    });
    if (signinResult.failure) {
      failures.push(signinResult.failure);
      continue;
    }

    const signin = signinResult.response;
    const signinBody = signinResult.body;
    const session = getSigninSession(signinBody);
    if (!signin.ok || !session.accessToken) {
      failures.push(
        apiFailure(email, `Signin failed with status ${signin.status}.`),
      );
      continue;
    }

    users[email] = {
      signedIn: true,
      organizationId: session.organizationId,
      tenantId: session.tenantId,
      userId: session.userId,
    };

    for (const purpose of ['entry', 'manage'] as const) {
      const target = `${email}:${purpose}`;
      const challengeResult = await requestJson({
        fetchImpl,
        url: `${baseUrl}/api/cash-vault/challenge`,
        target,
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${session.accessToken}`,
            'organization-id': session.organizationId,
            'x-test-user': email,
          },
          body: JSON.stringify({
            password: input.passwords.cashVaultPasswords[email],
            purpose,
          }),
        } as any,
      });
      if (challengeResult.failure) {
        failures.push(challengeResult.failure);
        continue;
      }

      const challenge = challengeResult.response;
      const challengeBody = challengeResult.body;
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
        const target = `${business.organizationId}:balance-sheet`;
        const balanceSheetResult = await requestJson({
          fetchImpl,
          url: `${baseUrl}/api/reports/balance-sheet?fromDate=2026-04-01&toDate=2026-06-30`,
          target,
          init: {
            method: 'GET',
            headers: {
              authorization: `Bearer ${session.accessToken}`,
              'organization-id': business.organizationId,
              accept: 'application/json',
            },
          } as any,
        });
        if (balanceSheetResult.failure) {
          failures.push(balanceSheetResult.failure);
          continue;
        }

        const balanceSheet = balanceSheetResult.response;
        if (!balanceSheet.ok) {
          failures.push(
            apiFailure(
              target,
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
