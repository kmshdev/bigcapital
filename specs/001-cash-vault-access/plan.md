# Implementation Plan: Cash Vault Access

**Branch**: `develop` | **Date**: 2026-06-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-cash-vault-access/spec.md`

## Summary

Add tenant-local Cash Vault controls to Bigcapital's existing company/workspace model and localize the touched accounting flow for India. The implementation extends cash accounts with hidden Cash Vault state, adds Cash Vault access/unlock records, gates normal account and cashflow surfaces through a shared access service, and exposes narrow owner-management plus Help-menu accountant entry flows. Owner management selects the tenant's Help-menu Cash Vault entry target; accountant entries are deposit/withdrawal only, use INR, do not depend on Plaid, and delegate to the existing banking cashflow transaction path so ledger and audit subscribers keep working. The normal accountant flow also gains an Excel expense-sheet import mapped to the approved India schema.

## Technical Context

**Language/Version**: TypeScript 5.1 on Node.js 18.16.1 for `packages/server`; TypeScript 4.8/React 18 for `packages/webapp`

**Primary Dependencies**: NestJS 10, Objection/Knex, MySQL, CASL, class-validator, @nestjs/swagger, React 18, Blueprint.js, React Router, React Query, Formik/Yup, `@bigcapital/sdk-ts`

**Storage**: Tenant MySQL database via `packages/server/src/database/tenant/migrations`; existing system tenant/workspace membership remains authoritative; imported expense-sheet rows and import metadata remain tenant-scoped.

**Testing**: Jest and Supertest for server unit/integration tests; React Testing Library for webapp components where practical; existing Playwright e2e harness for critical journey checks

**Target Platform**: Bigcapital web application with NestJS API server, React webapp, and generated TypeScript SDK

**Project Type**: Web application monorepo with `packages/server`, `packages/webapp`, and `packages/sdk-ts`

**Performance Goals**: Existing account, banking account, and transaction list endpoints keep p95 under 200ms for typical tenant data by using indexed Cash Vault predicates and avoiding post-query filtering for list endpoints. Expense-sheet import preview should handle typical client workbooks without blocking normal request handling.

**Constraints**: Use `nvm use 18.16.1` before Node/pnpm commands; use `pnpm`; preserve existing tenant membership, `organization-id` request scoping, CASL permission model, OpenAPI generation, and banking cashflow transaction subscribers. Feature flows must default to INR and must not require Plaid-linked accounts.

**Scale/Scope**: One tenant-local feature spanning cash accounts, account visibility, cashflow account visibility, transaction history denial, owner management, Help-menu accountant deposit/withdrawal entry, full temporary unlocks for two designated admins, INR/no-Plaid accounting migration for touched flows, expense-sheet import, audit logging, SDK contracts, and focused UI surfaces.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality First**: PASS. The plan adds a focused `CashVault` module/service boundary and reuses existing account/banking modules instead of scattering policy logic through controllers.
- **Test-Driven Development**: PASS. Tasks must start with unit and integration tests for access decisions, list filtering, entry creation, unlock expiry, and contracts before implementation.
- **User Experience Consistency**: PASS. Webapp changes use existing React/Blueprint patterns, i18n strings, and the current Help/topbar/menu conventions.
- **Performance Requirements**: PASS with constraint. Tenant migrations must add indexes for Cash Vault marker/access lookups; list filters must be query-level where possible.
- **Security & Data Integrity**: PASS. Cash Vault visibility remains tenant-scoped, separate from normal admin access, audited, and delegated entry writes reuse existing financial posting paths. Import rows validate before commit and do not create partial records.

## Project Structure

### Documentation (this feature)

```text
specs/001-cash-vault-access/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── cash-vault.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/server/src/database/tenant/migrations/
└── <timestamp>_add_cash_vault_access.ts

packages/server/src/modules/CashVault/
├── CashVault.module.ts
├── CashVault.controller.ts
├── CashVaultApplication.service.ts
├── CashVaultAccess.service.ts
├── dtos/
│   ├── CashVaultAccount.dto.ts
│   ├── CashVaultEntry.dto.ts
│   └── CashVaultUnlock.dto.ts
├── models/
│   └── CashVaultUnlock.model.ts
└── queries-and-commands/
    ├── CreateCashVaultEntry.service.ts
    ├── ManageCashVaultAccount.service.ts
    └── ManageCashVaultUnlock.service.ts

packages/server/src/modules/Import/
├── Import.controller.ts
├── ImportFileDataTransformer.ts
├── ImportFileDataValidator.ts
└── sheet_utils.ts

packages/server/src/modules/ExpenseSheetImports/
├── ExpenseSheetImport.module.ts
├── ExpenseSheetImportResource.ts
├── ExpenseSheetSchema.ts
└── ExpenseSheetImportCommit.service.ts

packages/server/src/modules/Accounts/
├── GetAccounts.service.ts
├── GetAccount.service.ts
└── GetAccountTransactions.service.ts

packages/server/src/modules/BankingAccounts/
└── queries/GetBankAccounts.ts

packages/server/src/modules/BankingTransactions/
├── queries/GetBankAccountTransactions/GetBankAccountTransactionsRepo.service.ts
└── BankingTransactionsApplication.service.ts

packages/server/src/modules/Roles/
├── AbilitySchema.ts
├── Roles.types.ts
└── TenantAbilities.ts

packages/webapp/src/
├── constants/sidebarMenu.tsx
├── components/Dashboard/DashboardTopbar/
├── containers/CashVault/
│   ├── CashVaultEntryDialog.tsx
│   ├── CashVaultManagementPage.tsx
│   └── hooks.ts
├── containers/Import/
├── routes/dashboard.tsx
└── lang/*/index.json

packages/sdk-ts/
└── generated from OpenAPI after server contract changes
```

**Structure Decision**: Use a new `CashVault` server module for Cash Vault-specific rules and endpoints, while integrating its access service into existing account and banking query paths. Use Bigcapital's existing import module for workbook upload, column extraction, mapping, preview, and commit, adding an `ExpenseSheetImports` resource for the India expense-sheet schema. Use a small webapp `CashVault` container for the owner management surface and Help-menu entry dialog, and reuse the existing import UI for expense-sheet upload/mapping. Keep SDK changes generated from server OpenAPI.

## Complexity Tracking

No constitution violations. The new module is justified because Cash Vault access rules cross existing Accounts, BankingAccounts, BankingTransactions, Roles, AuditLogs, and webapp Help-menu surfaces; centralizing policy avoids duplicated authorization checks.

## Phase 0: Research

See [research.md](research.md). Decisions are resolved with no unresolved clarification markers.

## Phase 1: Design & Contracts

See [data-model.md](data-model.md), [contracts/cash-vault.openapi.yaml](contracts/cash-vault.openapi.yaml), and [quickstart.md](quickstart.md).

### Post-Design Constitution Check

- **Code Quality First**: PASS. Policy is centralized in `CashVaultAccessService`; existing modules consume it.
- **Test-Driven Development**: PASS. The generated task plan must include failing tests before implementation for each user story and access edge case.
- **User Experience Consistency**: PASS. UI scope is limited to Blueprint-compatible owner page and Help-menu dialog.
- **Performance Requirements**: PASS. Data model includes indexed marker and unlock lookups.
- **Security & Data Integrity**: PASS. Contracts preserve tenant scoping, explicit permissions, expiry, auditability, and existing ledger posting.
