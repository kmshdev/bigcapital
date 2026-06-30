import {
  evaluateEnvReadiness,
  parseDotEnvContent,
  redactEnvValue,
} from './BookeepzReadinessEnv';

describe('BookeepzReadinessEnv', () => {
  it('parses dotenv content without losing values that contain equals signs', () => {
    expect(
      parseDotEnvContent(
        ['APP_JWT_SECRET=a=b=c', '# comment', '', 'DB_HOST=mysql'].join('\n'),
      ),
    ).toEqual({
      APP_JWT_SECRET: 'a=b=c',
      DB_HOST: 'mysql',
    });
  });

  it('redacts values as presence and length only', () => {
    expect(redactEnvValue('secret-value')).toEqual({
      present: true,
      length: 12,
    });
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
    expect(result.userSecrets.ADMINF0_PASSWORD).toEqual({
      present: true,
      length: 7,
    });
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
