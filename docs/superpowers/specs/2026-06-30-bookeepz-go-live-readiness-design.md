# Bookeepz Go-Live Readiness Design

## Purpose

Bookeepz local go-live readiness is an operational verification workflow for the four seeded companies. It proves that the local app, tenant data, environment configuration, and Docker runtime all match the current source and the established Cash Vault/accounting decisions.

This design does not redesign Cash Vault naming, endpoints, designated-admin rules, or the four-company model. It turns the current implementation into repeatable proof that the committed source is actually running and that the live tenant data satisfies the expected bootstrap contract.

## Scope

The readiness workflow covers:

- Environment baseline from `./.env.example`, `packages/server/.env.example`, and `packages/webapp/.env.example`.
- Docker/runtime freshness for server and webapp containers.
- Four-company bootstrap state for:
  - Risingstone infra pvt ltd / `risingstone_infra_pvt_ltd`
  - Risingstone ventures pvt ltd / `risingstone_ventures_pvt_ltd`
  - Risingstone projects pvt Ltd / `risingstone_projects_pvt_ltd`
  - Mahetel pvt ltd / `mahetel_pvt_ltd`
- Default Bookeepz overlay accounts per company.
- `.user.env` login and Cash Vault credential consistency.
- Cash Vault role split for the two admins and accountant.
- Balance Sheet runtime health for a live tenant.

Out of scope:

- Renaming Cash Vault ledgers, routes, or challenge endpoints.
- Adding new account types.
- Replacing the existing tenant/workspace boundary.
- Reworking the broader normal-app surface design.
- Removing optional integrations such as Plaid, Stripe, LemonSqueezy, S3, mail, or PostHog from the product.

## Environment Baseline

The readiness workflow reads the three checked-in examples as the source of minimum local configuration expectations.

### Root `.env.example`

Runtime-critical values:

- `APP_JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `DB_CHARSET`
- `SYSTEM_DB_NAME`
- `TENANT_DB_NAME_PERFIX`
- `BASE_URL`
- `PUBLIC_PROXY_PORT`
- `PUBLIC_PROXY_SSL_PORT`
- `THROTTLE_GLOBAL_TTL`
- `THROTTLE_GLOBAL_LIMIT`
- `THROTTLE_AUTH_TTL`
- `THROTTLE_AUTH_LIMIT`
- `GOTENBERG_URL`
- `GOTENBERG_DOCS_URL`
- `EXCHANGE_RATE_SERVICE`
- `PLAID_ENV`

Optional integration values may be empty for local go-live readiness unless the specific integration is under test:

- Mail settings
- `OPEN_EXCHANGE_RATE_APP_ID`
- Plaid keys and webhook
- LemonSqueezy keys
- S3 settings
- PostHog settings
- Stripe settings

### `packages/server/.env.example`

The server package repeats the root runtime configuration and adds `JWT_SECRET`. Local readiness requires the active server runtime to have an application JWT secret path that can sign and verify auth tokens consistently.

Server runtime-critical values:

- `APP_JWT_SECRET`
- `JWT_SECRET`
- database values
- `SYSTEM_DB_NAME`
- `TENANT_DB_NAME_PERFIX`
- `BASE_URL`
- proxy ports when using the self-hosted compose file
- throttling values
- Gotenberg values

The readiness workflow must preserve the spelling `TENANT_DB_NAME_PERFIX`; it is the existing repo contract.

### `packages/webapp/.env.example`

The webapp example is build/client behavior configuration, not tenant data configuration:

- `REACT_APP_VERSION`
- `TSC_COMPILE_ON_ERROR`
- `ESLINT_NO_DEV_ERRORS`

Readiness should record these values and confirm the webapp build/runtime path is not stale, but it should not treat them as tenant bootstrap inputs.

## Company And Account Invariants

Each of the four companies must exist as an initialized tenant and must have the Bookeepz overlay accounts below.

### Default Expense Account

- `accountType`: `expense`
- `code`: `EXPMAIN01`
- `slug`: `<organizationId>-main-01`
- `name`: `<company name>_main_01`
- `currencyCode`: `INR`
- `active`: true
- `predefined`: false

This account is required because the expense-sheet import commit path resolves the deterministic default expense slug and expense posting validates an expense-root account.

### Default Payment Account

- `accountType`: `bank`
- `code`: `PAYMAIN01`
- `slug`: `<organizationId>-payment-01`
- `name`: `<company name>_payment_01`
- `currencyCode`: `INR`
- `active`: true
- `predefined`: false
- `isCashVault`: false

This account gives expense imports and normal payment posting a deterministic non-Cash-Vault payment account. Existing seeded bank accounts may still exist, but readiness must verify the Bookeepz-specific payment account as the stable local contract.

### Hidden Cash Vault Entry Account

- `accountType`: `cash`
- `code`: `CASH-VAULT`
- `slug`: `bookeepz-hidden-cash-vault`
- `currencyCode`: `INR`
- `active`: true
- `predefined`: false
- `isCashVault`: true
- `cashVaultEntryEnabled`: true

This is one hidden Cash Vault entry account per company. The two admins are designated admins for that account; readiness must not expect two separate Cash Vault accounts for the two admins.

## Credential Invariants

The local bootstrap credential file is `.user.env` at the repository root. It must contain:

- `ADMINF0_PASSWORD`
- `ADMINF1_PASSWORD`
- `ACCA0_PASSWORD`
- `ADMINF0_CASH_VAULT_PASSWORD`
- `ADMINF1_CASH_VAULT_PASSWORD`
- `ACCA0_CASH_VAULT_PASSWORD`

Readiness must not print secret values or password hashes. It should report only presence, length, and bcrypt match booleans.

For every company tenant:

- `adminF0@bookeepz.net` must exist.
- `adminF1@bookeepz.net` must exist.
- `acca0@bookeepz.net` must exist.
- login passwords from `.user.env` must match the system user hashes.
- Cash Vault passwords from `.user.env` must match the tenant `cash_vault_credentials` hashes.
- designated admins must be exactly `adminF0` and `adminF1`.

## Runtime Freshness

The running local app must reflect the committed source. Readiness should detect stale Docker images or stale compiled assets before interpreting browser/API behavior.

Minimum freshness checks:

- The server runtime must include the Balance Sheet net-income guard that treats missing income or expense account groups as empty arrays.
- The server runtime must include the Cash Vault challenge error classification: invalid password is unauthorized, non-designated manage unlock is forbidden.
- The webapp runtime must include the Cash Vault challenge dialog message split: invalid password remains a password failure, non-designated manage unlock reports designated-admin access.
- The app exposed through the configured proxy must route `/api` to the active server and `/` to the active webapp.

If `docker-compose.prod.yml` uses `bigcapitalhq/server:latest` or `bigcapitalhq/webapp:latest`, readiness must verify whether those tags were rebuilt locally from the current source before trusting browser results.

## Access Probes

Readiness should use API probes as the primary proof path.

For `adminF0@bookeepz.net`:

- signin succeeds.
- Cash Vault challenge with purpose `manage` succeeds.
- Cash Vault challenge with purpose `entry` succeeds.

For `adminF1@bookeepz.net`:

- signin succeeds.
- Cash Vault challenge with purpose `manage` succeeds.
- Cash Vault challenge with purpose `entry` succeeds.

For `acca0@bookeepz.net`:

- signin succeeds.
- Cash Vault challenge with purpose `entry` succeeds.
- Cash Vault challenge with purpose `manage` fails as non-designated, not as an invalid password.

These probes prove credential acceptance and the role split without exposing hidden account details.

## Balance Sheet Smoke

Readiness must verify that the Balance Sheet endpoint for a live company returns successfully even when a tenant has no income or expense account group in the report period.

The expected behavior is:

- no server crash from `undefined.map`;
- empty income or expense groups are treated as empty arrays;
- the report endpoint returns a valid response for the selected tenant;
- the browser page can render a no-results state without triggering repeated server errors.

## Failure Classes

Readiness output should group failures into specific causes:

- `env_missing`: a runtime-critical env value is absent.
- `env_mismatch`: active runtime values point to a different DB/container than the probe.
- `runtime_stale`: running server/webapp code differs from committed source expectations.
- `bootstrap_incomplete`: tenant, user, membership, account overlay, designated admin, or credential rows are missing.
- `credential_mismatch`: `.user.env` exists but stored hashes do not match.
- `access_policy_mismatch`: admin/accountant Cash Vault challenge behavior differs from the expected role split.
- `report_regression`: Balance Sheet API or browser smoke fails.

Every failure should name the operation and target tenant/user where possible. It must avoid printing secrets, raw password hashes, JWTs, or full cookies.

## Verification Strategy

Verification should be layered:

1. Static/source checks for expected guards and env-example keys.
2. Runtime checks against Docker/container state and compiled server/webapp output.
3. Database checks for company, user, account, credential, and designated-admin invariants.
4. API probes for signin, Cash Vault challenge, and Balance Sheet.
5. Optional browser smoke only after API evidence passes.

The final readiness result should be a compact pass/fail table per company and per user. It should also include exact commands used and whether the running app came from rebuilt local images or prebuilt tags.

## Testing Requirements

Server tests:

- Balance Sheet handles missing income account groups.
- Balance Sheet handles missing expense account groups.
- Cash Vault challenge returns unauthorized for invalid password.
- Cash Vault challenge returns forbidden for non-designated manage unlock.

Readiness probe tests:

- Missing `.user.env` reports `env_missing` without crashing.
- Missing tenant overlay account reports `bootstrap_incomplete`.
- Password hash mismatch reports `credential_mismatch` without printing secrets.
- Accountant manage challenge reports `access_policy_mismatch` only if it succeeds or fails as invalid password.

Runtime validation:

- `nvm use 18.16.1`
- `pnpm --filter @bigcapital/server test -- CashVaultChallenge.service.spec.ts --runInBand`
- `pnpm --filter @bigcapital/server test -- BalanceSheetRepositoryNetIncome.spec.ts --runInBand`
- `pnpm run build:server`
- local readiness probe command defined by the implementation plan

## Approval Gates

Readiness is complete only when:

- all four companies pass tenant/account/credential invariants;
- admin and accountant access probes match the expected split;
- Balance Sheet returns without crashing for the current live tenant;
- runtime freshness proves the app is running the committed source;
- any missing optional integration values are explicitly classified as out of scope for this local go-live proof.
