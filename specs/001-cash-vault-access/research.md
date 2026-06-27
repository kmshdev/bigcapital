# Research: Cash Vault Access

## Decision: Reuse tenant/workspace membership as the company boundary

**Rationale**: Bigcapital already scopes API requests by `organization-id` and tenant membership. Keeping Cash Vault tenant-local avoids a parallel business model and keeps workspace switching, membership checks, and tenant migrations aligned with the rest of the app.

**Alternatives considered**:
- New Business table separate from tenants: rejected because it duplicates workspace boundaries and would require broad routing/auth changes.
- Global Cash Vault registry: rejected because it increases cross-tenant leakage risk.

## Decision: Store Cash Vault state in tenant data

**Rationale**: Cash Vault accounts and unlocks are company-local. A tenant migration can add a simple account marker plus an unlock table with tenant-local foreign keys and indexes. This matches existing account and banking data placement.

**Alternatives considered**:
- System database Cash Vault tables: rejected because hidden account state belongs to tenant financial data and would complicate joins.
- Only role permissions with no account marker: rejected because visibility filtering needs account-level classification.

## Decision: Centralize access checks in `CashVaultAccessService`

**Rationale**: Cash Vault policy is used by account lists, account details, account transaction history, banking account lists, banking transaction history, owner management, and accountant entry. One service keeps the rules consistent: tenant scope, owner management, entry permission, temporary full unlock for two designated admins, and audit-worthy deny decisions.

**Alternatives considered**:
- Controller-only checks: rejected because list/query services would still leak data.
- Duplicated query predicates: rejected because behavior would drift across Accounts and Banking modules.

## Decision: Filter normal account/banking lists at query boundaries

**Rationale**: `GetAccountsService.getAccountsList` and `GetBankAccountsService.getCashflowAccounts` already build account queries. Adding Cash Vault predicates there keeps hidden accounts out of normal response payloads before transformation and improves performance over post-query filtering.

**Alternatives considered**:
- Frontend-only hiding: rejected because API payloads would still expose hidden accounts.
- Transformer-only hiding: rejected because pagination/filter metadata could still reflect hidden records.

## Decision: Deny hidden account details and history through service-level guards

**Rationale**: Details/history are direct lookup paths and need explicit Cash Vault checks before returning records. The plan applies guards to account detail, account transactions, bank account transaction history, and bank transaction detail paths.

**Alternatives considered**:
- Rely only on list filtering: rejected because direct URL/API access could still fetch hidden data.

## Decision: Accountant entry uses a Help-menu flow and delegates to existing cashflow transaction creation

**Rationale**: The requirement keeps accountants out of normal hidden account navigation. A Help-menu dialog can collect deposit/withdrawal inputs and submit through a Cash Vault endpoint that resolves the hidden account server-side, then delegates to `BankingTransactionsApplication.createTransaction` so ledger entries, transaction numbers, and existing subscribers remain authoritative.

**Alternatives considered**:
- New ledger writer: rejected because it risks bypassing established accounting behavior.
- Normal banking transaction form: rejected because it exposes cash account selectors and history context.

## Decision: Owner management defines one Help-menu entry target per tenant

**Rationale**: Accountant entry must not expose hidden account identity, but the server still needs a deterministic Cash Vault account for deposits and withdrawals. Owner management will mark one Cash Vault account as the Help-menu entry target for the selected tenant. The accountant payload omits hidden account ids; the server resolves the target after permission and tenant checks.

**Alternatives considered**:
- Let accountants choose hidden account ids: rejected because it leaks hidden account identity through UI or request payloads.
- Infer the first Cash Vault account automatically: rejected because it is ambiguous when a tenant has multiple Cash Vault accounts.
- Create a separate non-account vault ledger: rejected because entries must remain normal financial activity through existing cashflow posting.

## Decision: Define Cash Vault permissions separately from normal admin access

**Rationale**: Existing predefined admin maps to `manage all`; the spec requires normal admin-level platform access to remain possible while Cash Vault visibility and management stay separate. Add explicit Cash Vault ability subjects/actions and check them before hidden access.

**Alternatives considered**:
- Make accountants non-admin members only: rejected by clarified requirements.
- Let admin imply Cash Vault access: rejected because it violates hidden account separation.

## Decision: Temporary unlocks grant full Cash Vault access only to two designated admins until expiry

**Rationale**: Clarification requires full selected-company Cash Vault access for two designated admins until expiry. The unlock model must store designated admin eligibility and expiry, and access checks must reject non-designated users.

**Alternatives considered**:
- Entry-only unlocks: rejected by clarified requirements.
- Full unlock for any admin: rejected because the clarification limits full unlocks to two designated admins.

## Decision: Expose OpenAPI contracts and regenerate SDK

**Rationale**: The server already uses Nest Swagger and the repo has `generate:sdk-types`. Cash Vault endpoints should be documented through the same OpenAPI path, then consumed by webapp through the SDK/request conventions.

**Alternatives considered**:
- Handwritten webapp fetchers only: rejected because it bypasses shared contract generation.

## Decision: Migrate touched accounting flows to INR and remove Plaid dependency

**Rationale**: The target accounting workflow is India-localized. Cash Vault entry and expense-sheet import must work without Plaid-linked bank accounts and must treat monetary values as INR. Existing Plaid modules can remain elsewhere in the product, but this feature must not require Plaid data, Plaid account ids, or USD defaults.

**Alternatives considered**:
- Keep USD/Plaid defaults and convert later: rejected because it would make imported workbook values ambiguous and block non-Plaid customers.
- Remove all Plaid code globally in this feature: rejected as too broad for the current Cash Vault/import scope.

## Decision: Reuse Bigcapital's import pipeline for the expense-sheet flow

**Rationale**: The app already has import upload, sheet-column extraction, mapping, preview, validation, sample download, and commit utilities under `packages/server/src/modules/Import` and `packages/webapp/src/containers/Import`. Reusing that path supports "any set of columns from the schema" without a one-off parser.

**Alternatives considered**:
- Build a separate parser-only endpoint: rejected because the user needs an in-app accountant flow with mapping, validation, and preview.
- Require an exact workbook template: rejected because the requirement allows any subset of approved schema columns.

## Decision: Use the available workbook schema from `Format for Exp Sheet.xlsx`

**Rationale**: The requested `.xlsx1` path does not exist. The available workbook `/Users/kmsh/Developer/sure/docs/schemas/Format for Exp Sheet.xlsx` contains one sheet with these schema columns: Vendor's Name, Bill No, Item Description, Bill Date, Basic Value, GST, Freight Other, Total Bill Value, GST on RCM, TDS Deducted, LF & Intt, Date, Mode of Payment, Payment, Balance Payable, Remarks.

**Alternatives considered**:
- Reference the nonexistent `.xlsx1` file: rejected because downstream agents could not verify it.
- Invent additional columns: rejected because the schema workbook is the source of truth for v1.
