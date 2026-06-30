# Bookeepz Go-Live Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a repeatable local readiness workflow that proves Bookeepz env files, Docker runtime, tenant data, credentials, Cash Vault access, and Balance Sheet behavior match the approved go-live design.

**Architecture:** Add a server CLI command, `local:bookeepz:readiness`, that composes small, testable readiness checkers for env files, Docker/runtime freshness, database invariants, credential verification, and live API probes. The command prints redacted pass/fail tables and exits nonzero when any required readiness check fails.

**Tech Stack:** TypeScript, Nest Commander, Knex, bcrypt, Node.js 18 fetch, Jest, Docker Compose, existing Bigcapital CLI module.

---

## Source Context

Read these files before implementation:

- `docs/superpowers/specs/2026-06-30-bookeepz-go-live-readiness-design.md`
- `specs/001-cash-vault-access/spec.md`
- `specs/001-cash-vault-access/plan.md`
- `specs/001-cash-vault-access/tasks.md`
- `docs/superpowers/specs/2026-06-27-schema-bounded-normal-app-design.md`
- `.specify/memory/constitution.md`
- `AGENTS.md`

Current source anchors:

- `packages/server/src/modules/CLI/commands/LocalBookeepzBootstrap.command.ts` owns the four businesses, bootstrap users, `.user.env` keys, default account helpers, and Cash Vault ledger naming exports.
- `packages/server/src/modules/CLI/commands/BaseCommand.ts` provides `initSystemKnex()` and `initTenantKnex()`.
- `packages/server/src/modules/CLI/CLI.module.ts` registers CLI commands.
- `packages/server/package.json` and root `package.json` expose CLI scripts.
- `packages/server/src/modules/CashVault/queries-and-commands/CashVaultChallenge.service.ts` implements password challenge behavior.
- `packages/server/src/modules/CashVault/queries-and-commands/CashVaultPasswordVerifier.service.ts` uses bcrypt against `cash_vault_credentials.password_hash`.
- `packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetRepositoryNetIncome.ts` contains the missing income/expense group guard.
- `docker-compose.prod.yml` runs `server`, `webapp`, `proxy`, `mysql`, and `redis`; server DB host is `mysql`.
- `docker/envoy/envoy.yaml` routes `/api` to `server:3000` and `/` to `webapp:80`.
- `setup.sh` already builds local images, starts services, copies `.user.env` into the server container, and runs `local:bookeepz:bootstrap`.

## File Structure

Create focused readiness helpers under the existing CLI command area:

- Create `packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.ts`
  - Parse dotenv-like files without printing secrets.
  - Evaluate root, server, webapp, active `.env`, and `.user.env` key presence.
  - Return structured failure classes `env_missing` and `env_mismatch`.

- Create `packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.ts`
  - Inspect source freshness markers.
  - Inspect Docker container state and compiled files through an injected runner.
  - Return `runtime_stale` failures without requiring unit tests to run Docker.

- Create `packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.ts`
  - Pure evaluators for tenant, account, designated-admin, and redacted credential rows.
  - Keep expected Bookeepz constants in one place by importing bootstrap exports.

- Create `packages/server/src/modules/CLI/commands/BookeepzReadinessDatabase.ts`
  - Query system and tenant DBs.
  - Adapt DB rows into the pure invariant evaluators.
  - Use bcrypt only to return match booleans, never secrets or hashes.

- Create `packages/server/src/modules/CLI/commands/BookeepzReadinessApi.ts`
  - Use Node 18 `fetch` to sign in, challenge Cash Vault, and request Balance Sheet through the configured proxy.
  - Redact access tokens and cookies from all output.

- Create `packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.ts`
  - Orchestrate all checkers.
  - Print compact pass/fail tables grouped by company and user.
  - Exit `0` only when required checks pass.

- Modify `packages/server/src/modules/CLI/CLI.module.ts`
  - Register `LocalBookeepzReadinessCommand`.

- Modify `packages/server/package.json`
  - Add `cli:local:bookeepz:readiness`.

- Modify root `package.json`
  - Add `local:bookeepz:readiness`.

- Modify `setup.sh`
  - Add a menu action to run readiness inside the running server container after `.user.env` is copied.

- Test files:
  - Create `packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.spec.ts`
  - Create `packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.spec.ts`
  - Create `packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.spec.ts`
  - Create `packages/server/src/modules/CLI/commands/BookeepzReadinessApi.spec.ts`
  - Create `packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.spec.ts`
  - Modify `packages/server/src/modules/CashVault/queries-and-commands/CashVaultChallenge.service.spec.ts`
  - Keep `packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetRepositoryNetIncome.spec.ts` as the focused Balance Sheet guard test; extend only if implementation changes the guard.

## Task 1: Env Contract Parser

**Files:**
- Create: `packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.ts`
- Test: `packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.spec.ts`

- [x] **Step 1: Write the failing env parser tests**

```ts
import {
  evaluateEnvReadiness,
  parseDotEnvContent,
  redactEnvValue,
} from './BookeepzReadinessEnv';

describe('BookeepzReadinessEnv', () => {
  it('parses dotenv content without losing values that contain equals signs', () => {
    expect(
      parseDotEnvContent(['APP_JWT_SECRET=a=b=c', '# comment', '', 'DB_HOST=mysql'].join('\n')),
    ).toEqual({
      APP_JWT_SECRET: 'a=b=c',
      DB_HOST: 'mysql',
    });
  });

  it('redacts values as presence and length only', () => {
    expect(redactEnvValue('secret-value')).toEqual({ present: true, length: 12 });
    expect(redactEnvValue('')).toEqual({ present: false, length: 0 });
    expect(redactEnvValue(undefined)).toEqual({ present: false, length: 0 });
  });

  it('requires runtime-critical root and server keys but allows optional integration keys to be empty', () => {
    const result = evaluateEnvReadiness({
      rootExample: {
        APP_JWT_SECRET: 'example',
        DB_HOST: 'localhost',
        DB_PORT: '3306',
        DB_USER: 'bigcapital',
        DB_PASSWORD: 'password',
        DB_ROOT_PASSWORD: 'root',
        DB_CHARSET: 'utf8',
        SYSTEM_DB_NAME: 'bigcapital',
        TENANT_DB_NAME_PERFIX: 'bigcapital_tenant_',
        BASE_URL: 'http://localhost',
        PUBLIC_PROXY_PORT: '80',
        PUBLIC_PROXY_SSL_PORT: '443',
        THROTTLE_GLOBAL_TTL: '60',
        THROTTLE_GLOBAL_LIMIT: '1000',
        THROTTLE_AUTH_TTL: '60',
        THROTTLE_AUTH_LIMIT: '100',
        GOTENBERG_URL: 'http://gotenberg:3000',
        GOTENBERG_DOCS_URL: 'http://gotenberg:3000',
        EXCHANGE_RATE_SERVICE: 'open_exchange_rate',
        PLAID_ENV: 'sandbox',
      },
      serverExample: {
        APP_JWT_SECRET: 'example',
        JWT_SECRET: 'jwt',
        DB_HOST: 'localhost',
        DB_PORT: '3306',
        DB_USER: 'bigcapital',
        DB_PASSWORD: 'password',
        SYSTEM_DB_NAME: 'bigcapital',
        TENANT_DB_NAME_PERFIX: 'bigcapital_tenant_',
        BASE_URL: 'http://localhost',
        GOTENBERG_URL: 'http://gotenberg:3000',
        GOTENBERG_DOCS_URL: 'http://gotenberg:3000',
      },
      webappExample: {
        REACT_APP_VERSION: '1.0.0',
        TSC_COMPILE_ON_ERROR: 'true',
        ESLINT_NO_DEV_ERRORS: 'true',
      },
      activeRoot: {
        APP_JWT_SECRET: 'active',
        JWT_SECRET: 'jwt',
        DB_HOST: 'mysql',
        DB_PORT: '3306',
        DB_USER: 'bigcapital',
        DB_PASSWORD: 'password',
        DB_ROOT_PASSWORD: 'root',
        DB_CHARSET: 'utf8',
        SYSTEM_DB_NAME: 'bigcapital',
        TENANT_DB_NAME_PERFIX: 'bigcapital_tenant_',
        BASE_URL: 'http://127.0.0.1',
        PUBLIC_PROXY_PORT: '80',
        PUBLIC_PROXY_SSL_PORT: '443',
        THROTTLE_GLOBAL_TTL: '60',
        THROTTLE_GLOBAL_LIMIT: '1000',
        THROTTLE_AUTH_TTL: '60',
        THROTTLE_AUTH_LIMIT: '100',
        GOTENBERG_URL: 'http://gotenberg:3000',
        GOTENBERG_DOCS_URL: 'http://gotenberg:3000',
        EXCHANGE_RATE_SERVICE: 'open_exchange_rate',
        PLAID_ENV: 'sandbox',
      },
      userEnv: {
        ADMINF0_PASSWORD: 'login-0',
        ADMINF1_PASSWORD: 'login-1',
        ACCA0_PASSWORD: 'login-2',
        ADMINF0_CASH_VAULT_PASSWORD: 'cash-0',
        ADMINF1_CASH_VAULT_PASSWORD: 'cash-1',
        ACCA0_CASH_VAULT_PASSWORD: 'cash-2',
      },
    });

    expect(result.failures).toEqual([]);
    expect(result.userSecrets.ADMINF0_PASSWORD).toEqual({ present: true, length: 7 });
    expect(result.runtime.activeDbHost).toBe('mysql');
  });

  it('reports missing .user.env keys without printing secret values', () => {
    const result = evaluateEnvReadiness({
      rootExample: {},
      serverExample: {},
      webappExample: {},
      activeRoot: {},
      userEnv: { ADMINF0_PASSWORD: 'login-0' },
    });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: 'env_missing',
          target: '.user.env:ADMINF1_PASSWORD',
        }),
        expect.objectContaining({
          class: 'env_missing',
          target: '.user.env:ACCA0_CASH_VAULT_PASSWORD',
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('login-0');
  });
});
```

- [x] **Step 2: Run the env parser test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessEnv --runInBand
```

Expected: FAIL because `BookeepzReadinessEnv.ts` does not exist.

- [x] **Step 3: Implement the env parser**

Create `packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.ts`:

```ts
export type ReadinessFailureClass =
  | 'env_missing'
  | 'env_mismatch'
  | 'runtime_stale'
  | 'bootstrap_incomplete'
  | 'credential_mismatch'
  | 'access_policy_mismatch'
  | 'report_regression';

export type ReadinessFailure = {
  class: ReadinessFailureClass;
  operation: string;
  target: string;
  message: string;
};

export type DotEnvMap = Record<string, string | undefined>;

export const ROOT_RUNTIME_KEYS = [
  'APP_JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_ROOT_PASSWORD',
  'DB_CHARSET',
  'SYSTEM_DB_NAME',
  'TENANT_DB_NAME_PERFIX',
  'BASE_URL',
  'PUBLIC_PROXY_PORT',
  'PUBLIC_PROXY_SSL_PORT',
  'THROTTLE_GLOBAL_TTL',
  'THROTTLE_GLOBAL_LIMIT',
  'THROTTLE_AUTH_TTL',
  'THROTTLE_AUTH_LIMIT',
  'GOTENBERG_URL',
  'GOTENBERG_DOCS_URL',
  'EXCHANGE_RATE_SERVICE',
  'PLAID_ENV',
] as const;

export const SERVER_RUNTIME_KEYS = [
  'APP_JWT_SECRET',
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'SYSTEM_DB_NAME',
  'TENANT_DB_NAME_PERFIX',
  'BASE_URL',
  'GOTENBERG_URL',
  'GOTENBERG_DOCS_URL',
] as const;

export const WEBAPP_RUNTIME_KEYS = [
  'REACT_APP_VERSION',
  'TSC_COMPILE_ON_ERROR',
  'ESLINT_NO_DEV_ERRORS',
] as const;

export const USER_SECRET_KEYS = [
  'ADMINF0_PASSWORD',
  'ADMINF1_PASSWORD',
  'ACCA0_PASSWORD',
  'ADMINF0_CASH_VAULT_PASSWORD',
  'ADMINF1_CASH_VAULT_PASSWORD',
  'ACCA0_CASH_VAULT_PASSWORD',
] as const;

export function parseDotEnvContent(content: string): DotEnvMap {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [key, ...value] = line.split('=');
        return [key, value.join('=')];
      }),
  );
}

export function redactEnvValue(value: string | undefined) {
  return {
    present: Boolean(value),
    length: value?.length ?? 0,
  };
}

function requireKeys(
  env: DotEnvMap,
  keys: readonly string[],
  label: string,
): ReadinessFailure[] {
  return keys
    .filter((key) => !env[key])
    .map((key) => ({
      class: 'env_missing' as const,
      operation: 'env.check',
      target: `${label}:${key}`,
      message: `${label} is missing required key ${key}`,
    }));
}

export function evaluateEnvReadiness(input: {
  rootExample: DotEnvMap;
  serverExample: DotEnvMap;
  webappExample: DotEnvMap;
  activeRoot: DotEnvMap;
  userEnv: DotEnvMap;
}) {
  const failures = [
    ...requireKeys(input.rootExample, ROOT_RUNTIME_KEYS, '.env.example'),
    ...requireKeys(input.serverExample, SERVER_RUNTIME_KEYS, 'packages/server/.env.example'),
    ...requireKeys(input.webappExample, WEBAPP_RUNTIME_KEYS, 'packages/webapp/.env.example'),
    ...requireKeys(input.activeRoot, ROOT_RUNTIME_KEYS, '.env'),
    ...requireKeys(input.userEnv, USER_SECRET_KEYS, '.user.env'),
  ];

  if (!('TENANT_DB_NAME_PERFIX' in input.activeRoot)) {
    failures.push({
      class: 'env_missing',
      operation: 'env.check',
      target: '.env:TENANT_DB_NAME_PERFIX',
      message: 'Preserve existing TENANT_DB_NAME_PERFIX spelling in active env.',
    });
  }

  return {
    failures,
    runtime: {
      activeDbHost: input.activeRoot.DB_HOST,
      activeDbPort: input.activeRoot.DB_PORT,
      baseUrl: input.activeRoot.BASE_URL,
      publicProxyPort: input.activeRoot.PUBLIC_PROXY_PORT,
    },
    userSecrets: Object.fromEntries(
      USER_SECRET_KEYS.map((key) => [key, redactEnvValue(input.userEnv[key])]),
    ),
  };
}
```

- [x] **Step 4: Run the env parser test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessEnv --runInBand
```

Expected: PASS.

- [x] **Step 5: Commit env parser**

```bash
git add packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.ts packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.spec.ts
git commit -m "feat(readiness): validate Bookeepz env inputs"
```

## Task 2: Runtime Freshness Checker

**Files:**
- Create: `packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.ts`
- Test: `packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.spec.ts`

- [x] **Step 1: Write the failing runtime checker tests**

```ts
import { checkRuntimeFreshness, RuntimeCommandRunner } from './BookeepzReadinessRuntime';

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
          stdout: 'Cash Vault management access is limited to the two designated admins.',
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
```

- [x] **Step 2: Run the runtime checker test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessRuntime --runInBand
```

Expected: FAIL because `BookeepzReadinessRuntime.ts` does not exist.

- [x] **Step 3: Implement runtime freshness checks with an injected runner**

Create `packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.ts`:

```ts
import { execFile } from 'child_process';
import { promisify } from 'util';
import { ReadinessFailure } from './BookeepzReadinessEnv';

const execFileAsync = promisify(execFile);

export type RuntimeCommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type RuntimeCommandRunner = (
  command: string,
  args: string[],
) => Promise<RuntimeCommandResult>;

export const dockerRunner: RuntimeCommandRunner = async (command, args) => {
  try {
    const result = await execFileAsync(command, args, {
      maxBuffer: 1024 * 1024 * 4,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error: any) {
    return {
      ok: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    };
  }
};

function runtimeFailure(target: string, message: string): ReadinessFailure {
  return {
    class: 'runtime_stale',
    operation: 'runtime.check',
    target,
    message,
  };
}

export async function checkRuntimeFreshness({
  runner = dockerRunner,
}: {
  runner?: RuntimeCommandRunner;
}) {
  const serverProbe = await runner('docker', [
    'exec',
    'bigcapital-server',
    'sh',
    '-lc',
    [
      'grep -R "cash_vault_unlock_user_not_designated" -n /app/packages/server/dist || true',
      'grep -R "cash_vault_challenge_invalid" -n /app/packages/server/dist || true',
      'grep -R "ACCOUNT_PARENT_TYPE.INCOME) ?? \\[\\]" -n /app/packages/server/dist || true',
      'grep -R "ACCOUNT_PARENT_TYPE.EXPENSE) ?? \\[\\]" -n /app/packages/server/dist || true',
    ].join('; '),
  ]);

  const webappProbe = await runner('docker', [
    'exec',
    'bigcapital-webapp',
    'sh',
    '-lc',
    'grep -R "Cash Vault management access is limited to the two designated admins." -n /usr/share/nginx/html || true',
  ]);

  const serverOutput = serverProbe.stdout;
  const webappOutput = webappProbe.stdout;
  const markers = {
    server: {
      challengeSplit:
        serverOutput.includes('cash_vault_unlock_user_not_designated') &&
        serverOutput.includes('cash_vault_challenge_invalid'),
      balanceSheetGuard:
        serverOutput.includes('ACCOUNT_PARENT_TYPE.INCOME) ?? []') &&
        serverOutput.includes('ACCOUNT_PARENT_TYPE.EXPENSE) ?? []'),
    },
    webapp: {
      challengeMessageSplit: webappOutput.includes(
        'Cash Vault management access is limited to the two designated admins.',
      ),
    },
  };

  const failures: ReadinessFailure[] = [];
  if (!serverProbe.ok) {
    failures.push(runtimeFailure('bigcapital-server', serverProbe.stderr));
  }
  if (!webappProbe.ok) {
    failures.push(runtimeFailure('bigcapital-webapp', webappProbe.stderr));
  }
  if (!markers.server.challengeSplit) {
    failures.push(
      runtimeFailure(
        'bigcapital-server:CashVaultChallengeService',
        'Running server does not contain Cash Vault challenge error classification.',
      ),
    );
  }
  if (!markers.server.balanceSheetGuard) {
    failures.push(
      runtimeFailure(
        'bigcapital-server:BalanceSheetRepositoryNetIncome',
        'Running server does not contain missing income/expense group fallback.',
      ),
    );
  }
  if (!markers.webapp.challengeMessageSplit) {
    failures.push(
      runtimeFailure(
        'bigcapital-webapp:CashVaultChallengeDialog',
        'Running webapp does not contain designated-admin challenge message split.',
      ),
    );
  }

  return { failures, markers };
}
```

- [x] **Step 4: Run the runtime checker test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessRuntime --runInBand
```

Expected: PASS.

- [x] **Step 5: Commit runtime checker**

```bash
git add packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.ts packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.spec.ts
git commit -m "feat(readiness): detect stale Bookeepz runtime artifacts"
```

## Task 3: Pure Bookeepz Invariant Evaluators

**Files:**
- Create: `packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.ts`
- Test: `packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.spec.ts`

- [x] **Step 1: Write the failing invariant tests**

```ts
import {
  evaluateAccountInvariants,
  evaluateDesignatedAdmins,
  evaluateTenantInvariants,
} from './BookeepzReadinessInvariants';

describe('BookeepzReadinessInvariants', () => {
  it('passes tenant invariants for the four Bookeepz companies', () => {
    const result = evaluateTenantInvariants([
      { id: 1, organizationId: 'risingstone_infra_pvt_ltd', initializedAt: new Date(), seededAt: new Date(), builtAt: new Date() },
      { id: 2, organizationId: 'risingstone_ventures_pvt_ltd', initializedAt: new Date(), seededAt: new Date(), builtAt: new Date() },
      { id: 3, organizationId: 'risingstone_projects_pvt_ltd', initializedAt: new Date(), seededAt: new Date(), builtAt: new Date() },
      { id: 4, organizationId: 'mahetel_pvt_ltd', initializedAt: new Date(), seededAt: new Date(), builtAt: new Date() },
    ]);

    expect(result.failures).toEqual([]);
  });

  it('requires the default expense, payment, and Cash Vault accounts for each company', () => {
    const result = evaluateAccountInvariants({
      business: {
        name: 'Risingstone infra pvt ltd',
        organizationId: 'risingstone_infra_pvt_ltd',
        baseCurrency: 'INR',
      },
      accounts: [
        {
          slug: 'risingstone_infra_pvt_ltd-main-01',
          name: 'Risingstone infra pvt ltd_main_01',
          accountType: 'expense',
          code: 'EXPMAIN01',
          currencyCode: 'INR',
          active: true,
          predefined: false,
        },
        {
          slug: 'risingstone_infra_pvt_ltd-payment-01',
          name: 'Risingstone infra pvt ltd_payment_01',
          accountType: 'bank',
          code: 'PAYMAIN01',
          currencyCode: 'INR',
          active: true,
          predefined: false,
          isCashVault: false,
        },
        {
          slug: 'bookeepz-hidden-cash-vault',
          name: 'TEST_LEDGER_429909',
          accountType: 'cash',
          code: 'CASH-VAULT',
          currencyCode: 'INR',
          active: true,
          predefined: false,
          isCashVault: true,
          cashVaultEntryEnabled: true,
        },
      ],
    });

    expect(result.failures).toEqual([]);
  });

  it('rejects stale Hidden Cash Vault display names', () => {
    const result = evaluateAccountInvariants({
      business: {
        name: 'Risingstone infra pvt ltd',
        organizationId: 'risingstone_infra_pvt_ltd',
        baseCurrency: 'INR',
      },
      accounts: [
        {
          slug: 'bookeepz-hidden-cash-vault',
          name: 'Hidden Cash Vault',
          accountType: 'cash',
          code: 'CASH-VAULT',
          currencyCode: 'INR',
          active: true,
          predefined: false,
          isCashVault: true,
          cashVaultEntryEnabled: true,
        },
      ],
    });

    expect(result.failures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          class: 'bootstrap_incomplete',
          target: 'risingstone_infra_pvt_ltd:bookeepz-hidden-cash-vault:name',
        }),
      ]),
    );
  });

  it('requires exactly adminF0 and adminF1 as designated admins', () => {
    const result = evaluateDesignatedAdmins({
      organizationId: 'risingstone_infra_pvt_ltd',
      rows: [
        { email: 'adminF0@bookeepz.net' },
        { email: 'adminF1@bookeepz.net' },
      ],
    });

    expect(result.failures).toEqual([]);
  });
});
```

- [x] **Step 2: Run the invariant test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessInvariants --runInBand
```

Expected: FAIL because `BookeepzReadinessInvariants.ts` does not exist.

- [x] **Step 3: Implement pure invariant evaluators**

Create `packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.ts`:

```ts
import {
  BOOTSTRAP_BUSINESSES,
  getCashVaultLedgerName,
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
  getDefaultPaymentAccountName,
  getDefaultPaymentAccountSlug,
} from './LocalBookeepzBootstrap.command';
import { ReadinessFailure } from './BookeepzReadinessEnv';

type Business = (typeof BOOTSTRAP_BUSINESSES)[number];
type AccountRow = Record<string, any>;

function failure(
  target: string,
  message: string,
  operation = 'bootstrap.check',
): ReadinessFailure {
  return {
    class: 'bootstrap_incomplete',
    operation,
    target,
    message,
  };
}

function bool(value: any) {
  return value === true || value === 1 || value === '1';
}

function findBySlug(accounts: AccountRow[], slug: string) {
  return accounts.find((account) => account.slug === slug);
}

export function evaluateTenantInvariants(tenants: AccountRow[]) {
  const failures: ReadinessFailure[] = [];
  for (const business of BOOTSTRAP_BUSINESSES) {
    const tenant = tenants.find(
      (row) => row.organizationId === business.organizationId,
    );
    if (!tenant) {
      failures.push(failure(business.organizationId, 'Bookeepz tenant is missing.'));
      continue;
    }
    for (const key of ['initializedAt', 'seededAt', 'builtAt']) {
      if (!tenant[key]) {
        failures.push(
          failure(`${business.organizationId}:${key}`, `Tenant is missing ${key}.`),
        );
      }
    }
  }
  return { failures };
}

export function evaluateAccountInvariants(input: {
  business: Business;
  accounts: AccountRow[];
}) {
  const { business, accounts } = input;
  const failures: ReadinessFailure[] = [];
  const expense = findBySlug(accounts, getDefaultExpenseAccountSlug(business));
  const payment = findBySlug(accounts, getDefaultPaymentAccountSlug(business));
  const cashVault = findBySlug(accounts, 'bookeepz-hidden-cash-vault');

  if (!expense) {
    failures.push(failure(`${business.organizationId}:expense`, 'Default expense account is missing.'));
  } else {
    const expected = {
      name: getDefaultExpenseAccountName(business),
      accountType: 'expense',
      code: 'EXPMAIN01',
      currencyCode: 'INR',
      active: true,
      predefined: false,
    };
    for (const [key, value] of Object.entries(expected)) {
      if (expense[key] !== value) {
        failures.push(failure(`${business.organizationId}:${expense.slug}:${key}`, `Expected ${key} to equal ${String(value)}.`));
      }
    }
  }

  if (!payment) {
    failures.push(failure(`${business.organizationId}:payment`, 'Default payment account is missing.'));
  } else {
    const expected = {
      name: getDefaultPaymentAccountName(business),
      accountType: 'bank',
      code: 'PAYMAIN01',
      currencyCode: 'INR',
      active: true,
      predefined: false,
      isCashVault: false,
    };
    for (const [key, value] of Object.entries(expected)) {
      const actual = key === 'isCashVault' ? bool(payment[key]) : payment[key];
      if (actual !== value) {
        failures.push(failure(`${business.organizationId}:${payment.slug}:${key}`, `Expected ${key} to equal ${String(value)}.`));
      }
    }
  }

  if (!cashVault) {
    failures.push(failure(`${business.organizationId}:bookeepz-hidden-cash-vault`, 'Cash Vault account is missing.'));
  } else {
    const expectedName = getCashVaultLedgerName(business.organizationId);
    if (cashVault.name !== expectedName || !/^TEST_LEDGER_\d{6}$/.test(cashVault.name)) {
      failures.push(failure(`${business.organizationId}:bookeepz-hidden-cash-vault:name`, 'Cash Vault name must match deterministic TEST_LEDGER_ followed by six digits.'));
    }
    const expected = {
      accountType: 'cash',
      code: 'CASH-VAULT',
      currencyCode: 'INR',
      active: true,
      predefined: false,
      isCashVault: true,
      cashVaultEntryEnabled: true,
    };
    for (const [key, value] of Object.entries(expected)) {
      const actual =
        key === 'isCashVault' || key === 'cashVaultEntryEnabled'
          ? bool(cashVault[key])
          : cashVault[key];
      if (actual !== value) {
        failures.push(failure(`${business.organizationId}:bookeepz-hidden-cash-vault:${key}`, `Expected ${key} to equal ${String(value)}.`));
      }
    }
  }

  return { failures };
}

export function evaluateDesignatedAdmins(input: {
  organizationId: string;
  rows: { email: string }[];
}) {
  const emails = input.rows.map((row) => row.email).sort();
  const expected = ['adminF0@bookeepz.net', 'adminF1@bookeepz.net'].sort();
  if (JSON.stringify(emails) !== JSON.stringify(expected)) {
    return {
      failures: [
        failure(
          `${input.organizationId}:cash_vault_designated_admins`,
          'Designated admins must be exactly adminF0@bookeepz.net and adminF1@bookeepz.net.',
        ),
      ],
    };
  }
  return { failures: [] as ReadinessFailure[] };
}
```

- [x] **Step 4: Run the invariant test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessInvariants --runInBand
```

Expected: PASS.

- [x] **Step 5: Commit invariant evaluators**

```bash
git add packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.ts packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.spec.ts
git commit -m "feat(readiness): codify Bookeepz tenant invariants"
```

## Task 4: Database And Credential Checker

**Files:**
- Create: `packages/server/src/modules/CLI/commands/BookeepzReadinessDatabase.ts`
- Test: extend `packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.spec.ts`

- [x] **Step 1: Add failing redacted credential tests**

Append to `BookeepzReadinessInvariants.spec.ts`:

```ts
import { evaluateCredentialMatches } from './BookeepzReadinessDatabase';

describe('BookeepzReadinessDatabase credential evaluation', () => {
  it('returns bcrypt match booleans without returning passwords or hashes', async () => {
    const result = await evaluateCredentialMatches({
      organizationId: 'risingstone_infra_pvt_ltd',
      loginPasswords: {
        'adminF0@bookeepz.net': 'login-0',
      },
      cashVaultPasswords: {
        'adminF0@bookeepz.net': 'cash-0',
      },
      systemUsers: [
        {
          id: 10,
          email: 'adminF0@bookeepz.net',
          password: await require('bcrypt').hash('login-0', 4),
        },
      ],
      cashVaultCredentials: [
        {
          userId: 10,
          email: 'adminF0@bookeepz.net',
          passwordHash: await require('bcrypt').hash('cash-0', 4),
        },
      ],
    });

    expect(result.failures).toEqual([]);
    expect(result.matches['adminF0@bookeepz.net']).toEqual({
      loginPassword: true,
      cashVaultPassword: true,
    });
    expect(JSON.stringify(result)).not.toContain('login-0');
    expect(JSON.stringify(result)).not.toContain('cash-0');
    expect(JSON.stringify(result)).not.toContain('$2');
  });
});
```

- [x] **Step 2: Run the credential test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessInvariants --runInBand
```

Expected: FAIL because `BookeepzReadinessDatabase.ts` does not exist.

- [x] **Step 3: Implement DB credential evaluation and DB query adapter**

Create `packages/server/src/modules/CLI/commands/BookeepzReadinessDatabase.ts`:

```ts
import * as bcrypt from 'bcrypt';
import {
  BOOTSTRAP_BUSINESSES,
  BOOTSTRAP_USERS,
  parseBootstrapSecrets,
} from './LocalBookeepzBootstrap.command';
import { ReadinessFailure } from './BookeepzReadinessEnv';
import {
  evaluateAccountInvariants,
  evaluateDesignatedAdmins,
  evaluateTenantInvariants,
} from './BookeepzReadinessInvariants';

type AnyKnex = any;

function credentialFailure(
  target: string,
  message: string,
): ReadinessFailure {
  return {
    class: 'credential_mismatch',
    operation: 'credential.bcrypt',
    target,
    message,
  };
}

export async function evaluateCredentialMatches(input: {
  organizationId: string;
  loginPasswords: Record<string, string | undefined>;
  cashVaultPasswords: Record<string, string | undefined>;
  systemUsers: { id: number; email: string; password: string }[];
  cashVaultCredentials: { userId: number; email: string; passwordHash: string }[];
}) {
  const failures: ReadinessFailure[] = [];
  const matches: Record<
    string,
    { loginPassword: boolean; cashVaultPassword: boolean }
  > = {};

  for (const user of BOOTSTRAP_USERS) {
    const systemUser = input.systemUsers.find((row) => row.email === user.email);
    const credential = input.cashVaultCredentials.find(
      (row) => row.email === user.email,
    );
    const loginPassword = input.loginPasswords[user.email];
    const cashVaultPassword = input.cashVaultPasswords[user.email];
    const loginMatch =
      Boolean(systemUser?.password && loginPassword) &&
      (await bcrypt.compare(loginPassword as string, systemUser.password));
    const cashVaultMatch =
      Boolean(credential?.passwordHash && cashVaultPassword) &&
      (await bcrypt.compare(cashVaultPassword as string, credential.passwordHash));

    matches[user.email] = {
      loginPassword: loginMatch,
      cashVaultPassword: cashVaultMatch,
    };
    if (!loginMatch) {
      failures.push(
        credentialFailure(
          `${input.organizationId}:${user.email}:login`,
          'Login password from .user.env does not match the stored system user hash.',
        ),
      );
    }
    if (!cashVaultMatch) {
      failures.push(
        credentialFailure(
          `${input.organizationId}:${user.email}:cash-vault`,
          'Cash Vault password from .user.env does not match tenant credential hash.',
        ),
      );
    }
  }

  return { failures, matches };
}

export async function checkBookeepzDatabaseReadiness(input: {
  systemKnex: AnyKnex;
  tenantKnexFactory: (organizationId: string) => AnyKnex;
  userEnvContent: string;
}) {
  const secrets = parseBootstrapSecrets(input.userEnvContent);
  const failures: ReadinessFailure[] = [];
  const companies: Record<string, any> = {};
  const tenants = await input.systemKnex('tenants');
  failures.push(...evaluateTenantInvariants(tenants).failures);

  const systemUsers = await input.systemKnex('users').whereIn(
    'email',
    BOOTSTRAP_USERS.map((user) => user.email),
  );

  for (const business of BOOTSTRAP_BUSINESSES) {
    const tenantKnex = input.tenantKnexFactory(business.organizationId);
    try {
      const accounts = await tenantKnex('accounts');
      const tenantUsers = await tenantKnex('users')
        .select('users.id', 'users.email')
        .whereIn(
          'users.email',
          BOOTSTRAP_USERS.map((user) => user.email),
        );
      const designatedAdmins = await tenantKnex('cash_vault_designated_admins')
        .join('users', 'users.id', 'cash_vault_designated_admins.userId')
        .select('users.email');
      const cashVaultCredentials = await tenantKnex('cash_vault_credentials')
        .join('users', 'users.id', 'cash_vault_credentials.userId')
        .select(
          'cash_vault_credentials.userId',
          'users.email',
          'cash_vault_credentials.passwordHash',
        );

      failures.push(
        ...evaluateAccountInvariants({ business, accounts }).failures,
        ...evaluateDesignatedAdmins({
          organizationId: business.organizationId,
          rows: designatedAdmins,
        }).failures,
      );

      const credentialResult = await evaluateCredentialMatches({
        organizationId: business.organizationId,
        loginPasswords: secrets.loginPasswords,
        cashVaultPasswords: secrets.cashVaultPasswords,
        systemUsers,
        cashVaultCredentials,
      });
      failures.push(...credentialResult.failures);
      companies[business.organizationId] = {
        users: tenantUsers.map((row) => row.email),
        credentialMatches: credentialResult.matches,
      };
    } finally {
      await tenantKnex.destroy?.();
    }
  }

  return { failures, companies };
}
```

- [x] **Step 4: Run the credential test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessInvariants --runInBand
```

Expected: PASS.

- [x] **Step 5: Commit DB checker**

```bash
git add packages/server/src/modules/CLI/commands/BookeepzReadinessDatabase.ts packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.spec.ts
git commit -m "feat(readiness): verify Bookeepz database credentials"
```

## Task 5: API Probe Client

**Files:**
- Create: `packages/server/src/modules/CLI/commands/BookeepzReadinessApi.ts`
- Test: `packages/server/src/modules/CLI/commands/BookeepzReadinessApi.spec.ts`

- [x] **Step 1: Write the failing API probe tests**

```ts
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
        if (body.purpose === 'manage' && init.headers['x-test-user'] === 'acca0@bookeepz.net') {
          return jsonResponse(403, { message: 'cash_vault_unlock_user_not_designated' });
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
    expect(calls.some((call) => call.url.endsWith('/api/reports/balance-sheet'))).toBe(true);
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
```

- [x] **Step 2: Run the API probe test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessApi --runInBand
```

Expected: FAIL because `BookeepzReadinessApi.ts` does not exist.

- [x] **Step 3: Implement API probes**

Create `packages/server/src/modules/CLI/commands/BookeepzReadinessApi.ts`:

```ts
import { BOOTSTRAP_BUSINESSES, BOOTSTRAP_USERS } from './LocalBookeepzBootstrap.command';
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
      failures.push(apiFailure(email, `Signin failed with status ${signin.status}.`));
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
        if (challenge.status !== 403 || challengeBody.message !== 'cash_vault_unlock_user_not_designated') {
          failures.push(apiFailure(target, 'Accountant manage challenge must fail as non-designated admin.'));
        }
      } else if (!challenge.ok) {
        failures.push(apiFailure(target, `Cash Vault challenge failed with status ${challenge.status}.`));
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
```

- [x] **Step 4: Run the API probe test and verify it passes**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadinessApi --runInBand
```

Expected: PASS.

- [x] **Step 5: Commit API probe client**

```bash
git add packages/server/src/modules/CLI/commands/BookeepzReadinessApi.ts packages/server/src/modules/CLI/commands/BookeepzReadinessApi.spec.ts
git commit -m "feat(readiness): probe Bookeepz live API behavior"
```

## Task 6: Readiness CLI Command

**Files:**
- Create: `packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.ts`
- Test: `packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.spec.ts`
- Modify: `packages/server/src/modules/CLI/CLI.module.ts`
- Modify: `packages/server/package.json`
- Modify: `package.json`

- [x] **Step 1: Write the failing command tests**

```ts
import { LocalBookeepzReadinessCommand, formatReadinessSummary } from './LocalBookeepzReadiness.command';

describe('LocalBookeepzReadinessCommand', () => {
  it('formats failures by class and target without secret values', () => {
    const text = formatReadinessSummary({
      failures: [
        {
          class: 'env_missing',
          operation: 'env.check',
          target: '.user.env:ADMINF0_PASSWORD',
          message: 'missing',
        },
      ],
      sections: {
        env: { failures: [] },
        runtime: { failures: [] },
        database: { failures: [] },
        api: { failures: [] },
      },
    });

    expect(text).toContain('Bookeepz readiness: FAIL');
    expect(text).toContain('env_missing');
    expect(text).toContain('.user.env:ADMINF0_PASSWORD');
    expect(text).not.toContain('password=');
    expect(text).not.toContain('Bearer ');
  });

  it('can be constructed by Nest command registration', () => {
    expect(LocalBookeepzReadinessCommand).toBeDefined();
  });
});
```

- [x] **Step 2: Run the command test and verify it fails**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- LocalBookeepzReadiness --runInBand
```

Expected: FAIL because `LocalBookeepzReadiness.command.ts` does not exist.

- [x] **Step 3: Implement the CLI command**

Create `packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'nest-commander';
import { ConfigService } from '@nestjs/config';
import { BaseCommand } from './BaseCommand';
import {
  evaluateEnvReadiness,
  parseDotEnvContent,
  ReadinessFailure,
} from './BookeepzReadinessEnv';
import { checkRuntimeFreshness } from './BookeepzReadinessRuntime';
import { checkBookeepzDatabaseReadiness } from './BookeepzReadinessDatabase';
import { runBookeepzApiProbes } from './BookeepzReadinessApi';
import { parseBootstrapSecrets } from './LocalBookeepzBootstrap.command';

type ReadinessSummary = {
  failures: ReadinessFailure[];
  sections: Record<string, any>;
};

function readEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return {};
  return parseDotEnvContent(fs.readFileSync(filePath, 'utf8'));
}

export function formatReadinessSummary(summary: ReadinessSummary) {
  const lines = [
    `Bookeepz readiness: ${summary.failures.length === 0 ? 'PASS' : 'FAIL'}`,
    '',
    '| Class | Operation | Target | Message |',
    '| --- | --- | --- | --- |',
  ];
  if (summary.failures.length === 0) {
    lines.push('| pass | all | Bookeepz local readiness | Required checks passed. |');
  } else {
    for (const failure of summary.failures) {
      lines.push(
        `| ${failure.class} | ${failure.operation} | ${failure.target} | ${failure.message.replace(/\|/g, '/')} |`,
      );
    }
  }
  lines.push('');
  lines.push('Secrets: redacted. Output contains only presence, length, and bcrypt match booleans.');
  return lines.join('\n');
}

@Command({
  name: 'local:bookeepz:readiness',
  description: 'Check local Bookeepz go-live readiness without printing secrets',
})
export class LocalBookeepzReadinessCommand extends BaseCommand {
  constructor(configService: ConfigService) {
    super(configService);
  }

  async run(): Promise<void> {
    const repoRoot = path.resolve(process.cwd(), '../..');
    const rootExamplePath = path.join(repoRoot, '.env.example');
    const activeEnvPath = path.join(repoRoot, '.env');
    const userEnvPath = path.join(repoRoot, '.user.env');
    const serverExamplePath = path.join(repoRoot, 'packages/server/.env.example');
    const webappExamplePath = path.join(repoRoot, 'packages/webapp/.env.example');
    const userEnvContent = fs.existsSync(userEnvPath)
      ? fs.readFileSync(userEnvPath, 'utf8')
      : '';

    const env = evaluateEnvReadiness({
      rootExample: readEnvFile(rootExamplePath),
      serverExample: readEnvFile(serverExamplePath),
      webappExample: readEnvFile(webappExamplePath),
      activeRoot: readEnvFile(activeEnvPath),
      userEnv: parseDotEnvContent(userEnvContent),
    });
    const runtime = await checkRuntimeFreshness({});
    const systemKnex = this.initSystemKnex();
    let database;
    try {
      database = await checkBookeepzDatabaseReadiness({
        systemKnex,
        tenantKnexFactory: (organizationId) => this.initTenantKnex(organizationId),
        userEnvContent,
      });
    } finally {
      await systemKnex.destroy?.();
    }
    const api = await runBookeepzApiProbes({
      baseUrl: env.runtime.baseUrl || 'http://127.0.0.1',
      passwords: parseBootstrapSecrets(userEnvContent),
    });

    const failures = [
      ...env.failures,
      ...runtime.failures,
      ...database.failures,
      ...api.failures,
    ];
    const summary = { failures, sections: { env, runtime, database, api } };
    this.log(formatReadinessSummary(summary));
    if (failures.length > 0) {
      process.exit(1);
    }
    process.exit(0);
  }
}
```

- [x] **Step 4: Register the CLI command**

Modify `packages/server/src/modules/CLI/CLI.module.ts`:

```ts
import { LocalBookeepzReadinessCommand } from './commands/LocalBookeepzReadiness.command';
```

Add the provider:

```ts
LocalBookeepzReadinessCommand,
```

- [x] **Step 5: Add package scripts**

In `packages/server/package.json`, add:

```json
"cli:local:bookeepz:readiness": "ts-node -r tsconfig-paths/register src/cli.ts local:bookeepz:readiness"
```

In root `package.json`, add:

```json
"local:bookeepz:readiness": "lerna run cli:local:bookeepz:readiness --scope \"@bigcapital/server\""
```

- [x] **Step 6: Run command tests and verify they pass**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- LocalBookeepzReadiness --runInBand
```

Expected: PASS.

- [x] **Step 7: Commit CLI command**

```bash
git add packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.ts packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.spec.ts packages/server/src/modules/CLI/CLI.module.ts packages/server/package.json package.json
git commit -m "feat(readiness): add Bookeepz readiness command"
```

## Task 7: Existing Behavior Tests For Readiness Markers

**Files:**
- Modify: `packages/server/src/modules/CashVault/queries-and-commands/CashVaultChallenge.service.spec.ts`
- Verify: `packages/server/src/modules/FinancialStatements/modules/BalanceSheet/BalanceSheetRepositoryNetIncome.spec.ts`

- [x] **Step 1: Strengthen Cash Vault challenge status tests**

Add imports:

```ts
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
```

Replace the invalid password expectation:

```ts
await expect(
  service.verifyChallenge({
    userId: 31,
    password: 'wrong-password',
    purpose: 'entry',
  }),
).rejects.toBeInstanceOf(UnauthorizedException);
```

Add the message check:

```ts
await expect(
  service.verifyChallenge({
    userId: 31,
    password: 'wrong-password',
    purpose: 'entry',
  }),
).rejects.toThrow('cash_vault_challenge_invalid');
```

Replace the non-designated manage expectation:

```ts
await expect(
  service.verifyChallenge({
    userId: 45,
    password: 'cash-password',
    purpose: 'manage',
  }),
).rejects.toBeInstanceOf(ForbiddenException);
```

Add the message check:

```ts
await expect(
  service.verifyChallenge({
    userId: 45,
    password: 'cash-password',
    purpose: 'manage',
  }),
).rejects.toThrow('cash_vault_unlock_user_not_designated');
```

- [x] **Step 2: Run Cash Vault challenge tests**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- CashVaultChallenge.service.spec.ts --runInBand
```

Expected: PASS.

- [x] **Step 3: Run Balance Sheet net-income guard tests**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BalanceSheetRepositoryNetIncome.spec.ts --runInBand
```

Expected: PASS. The tests must prove missing income and expense parent groups become `[]`, not `undefined.map(...)`.

- [x] **Step 4: Commit marker tests**

```bash
git add packages/server/src/modules/CashVault/queries-and-commands/CashVaultChallenge.service.spec.ts
git commit -m "test(readiness): pin Cash Vault challenge status split"
```

## Task 8: Setup Script Readiness Entry

**Files:**
- Modify: `setup.sh`

- [x] **Step 1: Add a readiness menu option**

Change the menu block to include readiness before exit:

```bash
echo "   7) Build local app images"
echo "   8) Start with local app images"
echo "   9) Readiness check"
echo "   10) Exit"
```

Change the validation regex:

```bash
until [[ -z "$ACTION" || "$ACTION" =~ ^([1-9]|10)$ ]]; do
```

- [x] **Step 2: Add the readiness shell function**

Add after `bootstrapLocalBookeepzData()`:

```bash
function runBookeepzReadiness() {
    if [ ! -f "$BOOKEEPZ_USER_ENV_PATH" ]; then
        echo "Bookeepz readiness failed: .user.env was not found"
        exit 1
    fi

    local api_container_id=$(docker container ls -q -f "name=bigcapital-server")
    if [ -z "$api_container_id" ]; then
        echo "Bookeepz readiness failed: bigcapital-server is not running"
        exit 1
    fi

    docker cp "$BOOKEEPZ_USER_ENV_PATH" "$api_container_id:/app/.user.env" || exit 1
    docker exec -u root "$api_container_id" chown nodejs:nodejs /app/.user.env || exit 1
    docker exec -u root "$api_container_id" chmod 600 /app/.user.env || exit 1
    docker exec -w /app/packages/server "$api_container_id" node dist/cli.js local:bookeepz:readiness || exit 1
}
```

- [x] **Step 3: Wire the action branch**

Add to the action dispatcher:

```bash
if [ "$ACTION" == "9" ] || [ "$DEFAULT_ACTION" == "readiness" ]
then
    runBookeepzReadiness
fi

if [ "$ACTION" == "10" ]
then
    exit
fi
```

- [x] **Step 4: Run shell syntax verification**

Run:

```bash
bash -n setup.sh
```

Expected: PASS with no output.

- [x] **Step 5: Commit setup integration**

```bash
git add setup.sh
git commit -m "feat(readiness): expose Bookeepz readiness in setup"
```

## Task 9: Focused Verification

**Files:**
- No source files created.

- [x] **Step 1: Run all readiness unit tests**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- BookeepzReadiness --runInBand
```

Expected: PASS.

- [x] **Step 2: Run existing behavior marker tests**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- CashVaultChallenge.service.spec.ts BalanceSheetRepositoryNetIncome.spec.ts --runInBand
```

Expected: PASS.

- [x] **Step 3: Build server and shared packages**

Run:

```bash
source ~/.nvm/nvm.sh
nvm use 18.16.1
pnpm run build:server
```

Expected: PASS.

- [x] **Step 4: Run shell syntax check**

Run:

```bash
bash -n setup.sh
```

Expected: PASS with no output.

- [ ] **Step 5: Run local readiness command against Docker**

Prerequisite: local Docker stack is running from rebuilt local images and `.user.env` exists.

Run:

```bash
./setup.sh readiness
```

Expected when local data is correct: `Bookeepz readiness: PASS`.

Expected when local data or runtime is stale: command exits nonzero and prints failure rows with one of these classes: `env_missing`, `env_mismatch`, `runtime_stale`, `bootstrap_incomplete`, `credential_mismatch`, `access_policy_mismatch`, or `report_regression`.

- [ ] **Step 6: Commit verification-only fixes if needed**

If verification reveals command-output formatting or test-only issues, commit only readiness files:

```bash
git add packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessDatabase.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessApi.ts \
  packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessEnv.spec.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessRuntime.spec.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessInvariants.spec.ts \
  packages/server/src/modules/CLI/commands/BookeepzReadinessApi.spec.ts \
  packages/server/src/modules/CLI/commands/LocalBookeepzReadiness.command.spec.ts \
  packages/server/src/modules/CLI/CLI.module.ts \
  packages/server/package.json \
  package.json \
  setup.sh
git commit -m "fix(readiness): stabilize local readiness checks"
```

## Self-Review

Spec coverage:

- Env baseline for `.env.example`, `packages/server/.env.example`, `packages/webapp/.env.example`, active `.env`, and `.user.env`: Task 1.
- Runtime freshness for server Balance Sheet guard, Cash Vault challenge split, webapp challenge message split, and Docker route assumptions: Task 2 and Task 8.
- Four-company tenant/account invariants, deterministic Cash Vault names, default expense/payment accounts, and designated admins: Task 3 and Task 4.
- Redacted `.user.env` and bcrypt match booleans: Task 1 and Task 4.
- API probes for signin, Cash Vault entry/manage split, and Balance Sheet: Task 5.
- Focused tests for Cash Vault status split and Balance Sheet missing groups: Task 7.
- Rebuild/restart/readiness execution path for Docker: Task 8 and Task 9.

Placeholder scan:

- No deferred implementation markers are intentionally present.
- Every code-changing task includes concrete code or exact edit snippets.
- Every verification step has a command and expected result.

Type consistency:

- Shared failure type is `ReadinessFailure`.
- Failure classes match the readiness spec exactly.
- Main command imports helper names defined in earlier tasks.
- Script names are `cli:local:bookeepz:readiness` and `local:bookeepz:readiness`.
