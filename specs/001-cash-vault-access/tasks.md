# Tasks: Cash Vault Access

**Input**: Design documents from `/specs/001-cash-vault-access/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/cash-vault.openapi.yaml`, `quickstart.md`, `.specify/memory/constitution.md`

**Tests**: Required by the feature plan and constitution. Write test tasks first in each story and confirm they fail before implementation.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after the shared foundation is in place.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature skeleton, contracts, and test entry points without changing behavior.

- [X] T001 Create Cash Vault module skeleton in `packages/server/src/modules/CashVault/CashVault.module.ts`
- [X] T002 [P] Create Cash Vault controller skeleton in `packages/server/src/modules/CashVault/CashVault.controller.ts`
- [X] T003 [P] Create Cash Vault application service skeleton in `packages/server/src/modules/CashVault/CashVaultApplication.service.ts`
- [X] T004 [P] Create Cash Vault access service skeleton in `packages/server/src/modules/CashVault/CashVaultAccess.service.ts`
- [X] T005 [P] Create expense-sheet import module skeleton in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImport.module.ts`
- [X] T006 [P] Add Cash Vault OpenAPI contract reference to `specs/001-cash-vault-access/contracts/cash-vault.openapi.yaml`
- [X] T007 Register `CashVaultModule` and `ExpenseSheetImportModule` imports in `packages/server/src/modules/App/App.module.ts`
- [X] T008 [P] Create webapp Cash Vault container index in `packages/webapp/src/containers/CashVault/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema, permissions, audit, and access primitives that all stories depend on.

**Critical**: No user story implementation should start until this phase is complete.

- [X] T009 [P] Add failing access-service tests for owner, accountant, normal admin, tenant switch, and active unlock decisions in `packages/server/src/modules/CashVault/CashVaultAccess.service.spec.ts`
- [X] T010 [P] Add failing migration tests for Cash Vault account flags, unlocks, designated admins, expense imports, and indexes in `packages/server/src/database/tenant/migrations/20260627090000_add_cash_vault_access.spec.ts`
- [X] T011 Add tenant migration for `accounts.is_cash_vault`, `accounts.cash_vault_entry_enabled`, designation audit columns, `cash_vault_unlocks`, `cash_vault_designated_admins`, `expense_sheet_imports`, and `expense_sheet_rows` in `packages/server/src/database/tenant/migrations/20260627090000_add_cash_vault_access.ts`
- [X] T012 [P] Create Cash Vault unlock model in `packages/server/src/modules/CashVault/models/CashVaultUnlock.model.ts`
- [X] T013 [P] Create Cash Vault designated admin model in `packages/server/src/modules/CashVault/models/CashVaultDesignatedAdmin.model.ts`
- [X] T014 [P] Create expense-sheet import models in `packages/server/src/modules/ExpenseSheetImports/models/ExpenseSheetImport.model.ts`
- [X] T015 [P] Create expense-sheet row model in `packages/server/src/modules/ExpenseSheetImports/models/ExpenseSheetRow.model.ts`
- [X] T016 Add `CashVault.Manage`, `CashVault.Entry`, and `CashVault.View` ability subjects/actions in `packages/server/src/modules/Roles/AbilitySchema.ts`
- [X] T017 Add Cash Vault ability typing in `packages/server/src/modules/Roles/Roles.types.ts`
- [X] T018 Update tenant ability construction so normal admin access does not imply Cash Vault access in `packages/server/src/modules/Roles/TenantAbilities.ts`
- [X] T019 Implement shared Cash Vault tenant/user access decisions in `packages/server/src/modules/CashVault/CashVaultAccess.service.ts`
- [X] T020 Add audit helpers for Cash Vault allowed and denied decisions in `packages/server/src/modules/CashVault/CashVaultAudit.service.ts`
- [X] T021 Register Cash Vault providers, models, and imports in `packages/server/src/modules/CashVault/CashVault.module.ts`
- [X] T022 Register expense-sheet providers, models, and import-module dependencies in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImport.module.ts`

**Checkpoint**: Shared tables, roles, access decisions, and module registration are ready.

---

## Phase 3: User Story 1 - Owner manages hidden cash vault accounts (Priority: P1) MVP

**Goal**: Owner admins can designate tenant cash accounts as Cash Vault accounts, choose the Help-menu entry target, and keep those accounts hidden from normal surfaces.

**Independent Test**: Sign in as an owner for one company, mark a cash account as Cash Vault, then verify users without Cash Vault access cannot discover it from normal account, banking, selector, detail, or history views.

### Tests for User Story 1

- [X] T023 [P] [US1] Add failing controller tests for `GET /cash-vault/accounts`, `POST /cash-vault/accounts`, and `DELETE /cash-vault/accounts/:accountId` in `packages/server/src/modules/CashVault/CashVault.controller.spec.ts`
- [X] T024 [P] [US1] Add failing owner management service tests for eligible cash account validation and one entry target per tenant in `packages/server/src/modules/CashVault/queries-and-commands/ManageCashVaultAccount.service.spec.ts`
- [X] T025 [P] [US1] Add failing account visibility tests for hidden accounts in `packages/server/src/modules/Accounts/GetAccounts.service.spec.ts`
- [X] T026 [P] [US1] Add failing banking account visibility tests for hidden cashflow accounts in `packages/server/src/modules/BankingAccounts/queries/GetBankAccounts.spec.ts`
- [X] T027 [P] [US1] Add failing detail and history denial tests in `packages/server/src/modules/Accounts/GetAccount.service.spec.ts`

### Implementation for User Story 1

- [X] T028 [P] [US1] Create Cash Vault account DTOs in `packages/server/src/modules/CashVault/dtos/CashVaultAccount.dto.ts`
- [X] T029 [US1] Implement owner account designation and entry-target selection in `packages/server/src/modules/CashVault/queries-and-commands/ManageCashVaultAccount.service.ts`
- [X] T030 [US1] Implement owner account list/designate/remove endpoints in `packages/server/src/modules/CashVault/CashVault.controller.ts`
- [X] T031 [US1] Filter Cash Vault accounts from ordinary account lists for users without full Cash Vault access in `packages/server/src/modules/Accounts/GetAccounts.service.ts`
- [X] T032 [US1] Deny Cash Vault account detail reads for users without full Cash Vault access in `packages/server/src/modules/Accounts/GetAccount.service.ts`
- [X] T033 [US1] Deny Cash Vault account transaction history for users without full Cash Vault access in `packages/server/src/modules/Accounts/GetAccountTransactions.service.ts`
- [X] T034 [US1] Filter Cash Vault accounts from banking account lists for users without full Cash Vault access in `packages/server/src/modules/BankingAccounts/queries/GetBankAccounts.ts`
- [X] T035 [US1] Deny banking transaction history for Cash Vault accounts without full Cash Vault access in `packages/server/src/modules/BankingTransactions/queries/GetBankAccountTransactions/GetBankAccountTransactionsRepo.service.ts`
- [X] T036 [P] [US1] Create owner management hooks in `packages/webapp/src/containers/CashVault/hooks.ts`
- [X] T037 [US1] Build owner Cash Vault management page with account designation, entry target, designated admins, and unlock entry points in `packages/webapp/src/containers/CashVault/CashVaultManagementPage.tsx`
- [X] T038 [US1] Add owner-only Cash Vault management route in `packages/webapp/src/routes/dashboard.tsx`
- [X] T039 [US1] Add Cash Vault menu permission hiding for owner management in `packages/webapp/src/constants/sidebarMenu.tsx`
- [X] T040 [US1] Add Cash Vault management i18n strings in `packages/webapp/src/lang/en/index.json`

**Checkpoint**: User Story 1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Accountant records entry-only Cash Vault activity (Priority: P2)

**Goal**: Accountants with normal admin-level platform access can create deposit and withdrawal entries from the Help menu without seeing hidden Cash Vault account data.

**Independent Test**: Sign in as an accountant, submit a Help-menu deposit and withdrawal for the selected company, then verify normal account and banking navigation still hides balances, details, and history.

### Tests for User Story 2

- [X] T041 [P] [US2] Add failing entry DTO validation tests for deposit/withdrawal-only, positive INR amount, required date, and no hidden account id in `packages/server/src/modules/CashVault/dtos/CashVaultEntry.dto.spec.ts`
- [X] T042 [P] [US2] Add failing service tests for server-side entry target resolution and delegation to banking transaction creation in `packages/server/src/modules/CashVault/queries-and-commands/CreateCashVaultEntry.service.spec.ts`
- [X] T043 [P] [US2] Add failing controller tests for `POST /cash-vault/entries` permission denial and success responses in `packages/server/src/modules/CashVault/CashVault.controller.spec.ts`
- [X] T044 [P] [US2] Add failing webapp tests for Help-menu entry dialog hiding Cash Vault account names and balances in `packages/webapp/src/containers/CashVault/CashVaultEntryDialog.spec.tsx`

### Implementation for User Story 2

- [X] T045 [P] [US2] Create Cash Vault entry request and response DTOs in `packages/server/src/modules/CashVault/dtos/CashVaultEntry.dto.ts`
- [X] T046 [US2] Implement accountant entry validation and server-side target account resolution in `packages/server/src/modules/CashVault/queries-and-commands/CreateCashVaultEntry.service.ts`
- [X] T047 [US2] Delegate accepted Cash Vault entries to `BankingTransactionsApplication.createTransaction` without Plaid fields in `packages/server/src/modules/CashVault/queries-and-commands/CreateCashVaultEntry.service.ts`
- [X] T048 [US2] Add `POST /cash-vault/entries` endpoint with tenant-scoped Cash Vault entry authorization in `packages/server/src/modules/CashVault/CashVault.controller.ts`
- [X] T049 [US2] Add Cash Vault entry API hooks in `packages/webapp/src/containers/CashVault/hooks.ts`
- [X] T050 [US2] Build accountant Help-menu Cash Vault entry dialog with deposit/withdrawal controls and INR amount handling in `packages/webapp/src/containers/CashVault/CashVaultEntryDialog.tsx`
- [X] T051 [US2] Add small Help-menu Cash Vault entry option in `packages/webapp/src/components/Dashboard/DashboardTopbar/DashboardTopbar.tsx`
- [X] T052 [US2] Add Cash Vault entry permission schema entries in `packages/webapp/src/constants/permissionsSchema.tsx`
- [X] T053 [US2] Add Cash Vault entry i18n strings and denial messages in `packages/webapp/src/lang/en/index.json`

**Checkpoint**: User Story 2 works without exposing the hidden account identity, balance, or history.

---

## Phase 5: User Story 3 - Temporary unlocks are scoped and expire (Priority: P3)

**Goal**: Owners can grant full temporary Cash Vault access only to one of the two designated admins for the selected company, and expiry/revocation is enforced.

**Independent Test**: Grant an unlock to a designated admin, verify full Cash Vault visibility in that company before expiry, verify no cross-company access, and verify access fails after expiry or revocation.

### Tests for User Story 3

- [X] T054 [P] [US3] Add failing designated-admin limit and tenant-membership tests in `packages/server/src/modules/CashVault/queries-and-commands/ManageCashVaultUnlock.service.spec.ts`
- [X] T055 [P] [US3] Add failing unlock expiry, revoke, non-designated rejection, and cross-company denial tests in `packages/server/src/modules/CashVault/CashVaultAccess.service.spec.ts`
- [X] T056 [P] [US3] Add failing controller tests for designated admins, unlock grant, and revoke endpoints in `packages/server/src/modules/CashVault/CashVault.controller.spec.ts`

### Implementation for User Story 3

- [X] T057 [P] [US3] Create Cash Vault unlock and designated-admin DTOs in `packages/server/src/modules/CashVault/dtos/CashVaultUnlock.dto.ts`
- [X] T058 [US3] Implement designated-admin replacement with a maximum of two active tenant users in `packages/server/src/modules/CashVault/queries-and-commands/ManageCashVaultUnlock.service.ts`
- [X] T059 [US3] Implement unlock grant, active check, expiry check, and revoke handling in `packages/server/src/modules/CashVault/queries-and-commands/ManageCashVaultUnlock.service.ts`
- [X] T060 [US3] Add designated admin and unlock endpoints to `packages/server/src/modules/CashVault/CashVault.controller.ts`
- [X] T061 [US3] Wire active full unlock checks into Cash Vault visibility decisions in `packages/server/src/modules/CashVault/CashVaultAccess.service.ts`
- [X] T062 [US3] Add unlock management controls to owner page in `packages/webapp/src/containers/CashVault/CashVaultManagementPage.tsx`
- [X] T063 [US3] Add unlock i18n strings and expiry messages in `packages/webapp/src/lang/en/index.json`

**Checkpoint**: User Story 3 enforces designated-admin eligibility, tenant scope, expiry, and revocation.

---

## Phase 6: User Story 4 - Accountant imports INR expense sheets (Priority: P4)

**Goal**: Accountants can upload an Excel expense sheet with any subset of approved schema columns, preview row-level validation, and commit accepted INR rows without Plaid.

**Independent Test**: Upload a workbook containing a valid subset of approved columns, map the columns, preview validation results, commit accepted rows, and verify invalid rows do not create partial records.

### Tests for User Story 4

- [X] T064 [P] [US4] Add failing schema tests for approved workbook headers and any-subset mapping in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetSchema.spec.ts`
- [X] T065 [P] [US4] Add failing parser tests for INR decimals, invalid booleans, invalid dates, blank cells, unsupported columns, and duplicate bill references in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImportCommit.service.spec.ts`
- [X] T066 [P] [US4] Add failing controller tests for upload, mapping, preview, and commit endpoints in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImport.controller.spec.ts`
- [X] T067 [P] [US4] Add failing webapp import flow tests for upload, mapping, row errors, and commit in `packages/webapp/src/containers/Import/ExpenseSheetImport.spec.tsx`

### Implementation for User Story 4

- [X] T068 [P] [US4] Define approved expense-sheet schema columns and canonical field names in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetSchema.ts`
- [X] T069 [US4] Add expense-sheet import resource metadata using the existing import pipeline in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImportResource.ts`
- [X] T070 [US4] Implement INR row validation and fail-closed monetary/date parsing in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImportCommit.service.ts`
- [X] T071 [US4] Implement upload, mapping, preview, and commit endpoints in `packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImport.controller.ts`
- [X] T072 [US4] Integrate expense-sheet resource registration with existing import resource application in `packages/server/src/modules/Import/ImportResourceApplication.ts`
- [X] T073 [US4] Add expense-sheet API hooks and query keys in `packages/webapp/src/hooks/query/import/queries.ts`
- [X] T074 [US4] Add expense-sheet import route and page wiring in `packages/webapp/src/routes/dashboard.tsx`
- [X] T075 [US4] Build expense-sheet import mapping and preview surface by reusing import components in `packages/webapp/src/containers/Import/ExpenseSheetImport.tsx`
- [X] T076 [US4] Add INR/no-Plaid labels, errors, and row status strings in `packages/webapp/src/lang/en/index.json`

**Checkpoint**: User Story 4 imports recognized columns as INR data, rejects invalid rows without partial records, and does not require Plaid.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Contract generation, broader verification, performance checks, and documentation updates across all stories.

- [ ] T077 [P] Add Cash Vault audit event assertions for management, entry, unlock, expiry use, and denied attempts in `packages/server/src/modules/CashVault/CashVaultAudit.service.spec.ts`
- [ ] T078 Implement Cash Vault audit event persistence through the existing audit log pattern in `packages/server/src/modules/CashVault/CashVaultAudit.service.ts`
- [ ] T079 [P] Add SDK generation coverage for Cash Vault and expense-sheet endpoints in `packages/sdk-ts/src/cash-vault.ts`
- [ ] T080 Regenerate SDK types after server OpenAPI updates in `packages/sdk-ts/`
- [X] T081 [P] Add quickstart validation notes for completed scenarios in `specs/001-cash-vault-access/quickstart.md`
- [X] T082 Run focused server tests with `nvm use 18.16.1 && pnpm --filter @bigcapital/server test -- CashVault` from `packages/server/package.json`
- [X] T083 Run focused server tests with `nvm use 18.16.1 && pnpm --filter @bigcapital/server test -- ExpenseSheet` from `packages/server/package.json`
- [ ] T084 Run webapp tests with `nvm use 18.16.1 && pnpm --filter @bigcapital/webapp test -- CashVault` from `packages/webapp/package.json`
- [ ] T085 Run typechecks with `nvm use 18.16.1 && pnpm --filter @bigcapital/server typecheck && pnpm --filter @bigcapital/webapp typecheck` from `package.json`
- [ ] T086 Run build verification with `nvm use 18.16.1 && pnpm build:server && pnpm build:webapp` from `package.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational and is the MVP.
- **User Story 2 (Phase 4)**: Depends on Foundational and integrates with the Cash Vault account entry target from US1 when delivered together.
- **User Story 3 (Phase 5)**: Depends on Foundational and can be implemented after or alongside US1 once access decisions exist.
- **User Story 4 (Phase 6)**: Depends on Foundational and can proceed independently of Cash Vault visibility work.
- **Polish (Phase 7)**: Depends on the selected story scope being complete.

### User Story Dependencies

- **US1 Owner manages hidden cash vault accounts**: MVP after Phase 2.
- **US2 Accountant records entry-only Cash Vault activity**: Requires the entry-target account concept from US1 for production use, but its endpoint/service can be tested with seeded data after Phase 2.
- **US3 Temporary unlocks are scoped and expire**: Requires shared access service from Phase 2; visibility effects are validated against US1 surfaces.
- **US4 Accountant imports INR expense sheets**: Requires shared tenant/auth/import foundation only; independent of Cash Vault account management.

### Within Each User Story

- Tests must be written and confirmed failing before implementation.
- Models and DTOs before services.
- Services before controllers.
- Controllers before SDK/webapp integration.
- UI hooks before pages/dialogs.
- Story checkpoint verification before moving to the next priority when working sequentially.

---

## Parallel Opportunities

- Phase 1 skeleton tasks T002-T006 and T008 can run in parallel.
- Phase 2 model tasks T012-T015 can run in parallel after migration shape is agreed.
- US1 tests T023-T027 can run in parallel.
- US1 server filtering tasks T031-T035 can be split by module after `CashVaultAccessService` is implemented.
- US2 tests T041-T044 can run in parallel.
- US3 tests T054-T056 can run in parallel.
- US4 tests T064-T067 can run in parallel.
- US4 schema/resource/UI work T068, T069, and T075 can run in parallel after contracts are stable.
- Polish test and doc tasks T077, T079, and T081 can run in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "T023 [P] [US1] Add failing controller tests for GET/POST/DELETE Cash Vault account endpoints in packages/server/src/modules/CashVault/CashVault.controller.spec.ts"
Task: "T025 [P] [US1] Add failing account visibility tests in packages/server/src/modules/Accounts/GetAccounts.service.spec.ts"
Task: "T026 [P] [US1] Add failing banking account visibility tests in packages/server/src/modules/BankingAccounts/queries/GetBankAccounts.spec.ts"
```

## Parallel Example: User Story 2

```bash
Task: "T041 [P] [US2] Add failing entry DTO validation tests in packages/server/src/modules/CashVault/dtos/CashVaultEntry.dto.spec.ts"
Task: "T042 [P] [US2] Add failing service tests in packages/server/src/modules/CashVault/queries-and-commands/CreateCashVaultEntry.service.spec.ts"
Task: "T044 [P] [US2] Add failing webapp tests in packages/webapp/src/containers/CashVault/CashVaultEntryDialog.spec.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T054 [P] [US3] Add failing designated-admin tests in packages/server/src/modules/CashVault/queries-and-commands/ManageCashVaultUnlock.service.spec.ts"
Task: "T055 [P] [US3] Add failing unlock expiry tests in packages/server/src/modules/CashVault/CashVaultAccess.service.spec.ts"
Task: "T056 [P] [US3] Add failing controller tests in packages/server/src/modules/CashVault/CashVault.controller.spec.ts"
```

## Parallel Example: User Story 4

```bash
Task: "T064 [P] [US4] Add failing schema tests in packages/server/src/modules/ExpenseSheetImports/ExpenseSheetSchema.spec.ts"
Task: "T065 [P] [US4] Add failing parser tests in packages/server/src/modules/ExpenseSheetImports/ExpenseSheetImportCommit.service.spec.ts"
Task: "T067 [P] [US4] Add failing webapp import flow tests in packages/webapp/src/containers/Import/ExpenseSheetImport.spec.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 owner Cash Vault management and hidden visibility filtering.
4. Stop and validate US1 independently with owner/non-owner tenant users.

### Incremental Delivery

1. Deliver US1 to make Cash Vault account designation and hiding real.
2. Deliver US2 to add Help-menu accountant deposit/withdrawal entry without visibility.
3. Deliver US3 to add full temporary unlocks for the two designated admins.
4. Deliver US4 to add INR/no-Plaid expense-sheet import for the normal accountant flow.
5. Run Phase 7 verification before claiming the feature is complete.

### Parallel Team Strategy

1. Complete Setup and Foundational phases together.
2. Split US1 server filtering, US2 Help-menu entry, US3 unlocks, and US4 imports across separate developers once `CashVaultAccessService` and migrations are stable.
3. Re-run focused tests and quickstart scenarios after each merged story.

## Notes

- Use `nvm use 18.16.1` before any Node or pnpm command.
- Use `pnpm`; do not introduce a second package manager.
- Keep Plaid integrations intact outside this feature, but Cash Vault entry and expense-sheet import tasks must not require Plaid account ids, Plaid transactions, or USD defaults.
- The approved expense-sheet schema source is `/Users/kmsh/Developer/sure/docs/schemas/Format for Exp Sheet.xlsx`; the originally mentioned `.xlsx1` path does not exist.
- Every task with `[P]` targets a different file or an independently testable path.
