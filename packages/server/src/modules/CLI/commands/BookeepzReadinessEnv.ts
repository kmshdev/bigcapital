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
    ...requireKeys(
      input.serverExample,
      SERVER_RUNTIME_KEYS,
      'packages/server/.env.example',
    ),
    ...requireKeys(
      input.webappExample,
      WEBAPP_RUNTIME_KEYS,
      'packages/webapp/.env.example',
    ),
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
