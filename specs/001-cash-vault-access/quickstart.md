# Quickstart: Cash Vault Access

This guide describes the validation path for the Cash Vault feature after implementation. It is not an implementation script.

## Prerequisites

- Use Node.js 18.16.1:

```bash
nvm use 18.16.1
```

- Install dependencies if needed:

```bash
pnpm install
```

- Apply tenant migrations in the target environment:

```bash
pnpm tenants:migrate:latest
```

- Regenerate SDK types after the server OpenAPI contract is implemented:

```bash
pnpm generate:sdk-types
```

## Validation Scenarios

### 1. Owner marks a cash account as Cash Vault

1. Sign in as an owner admin for a test company.
2. Create or select an eligible cash account.
3. Mark the account as Cash Vault through the owner management surface.
4. Verify the account appears in the Cash Vault management list.
5. Verify the account no longer appears in ordinary accounts, banking account lists, account selectors, or transaction history for users without Cash Vault access.

Expected outcome: Cash Vault account is hidden from normal surfaces while remaining available to authorized Cash Vault management.

### 2. Accountant uses Help-menu deposit/withdrawal entry

1. Sign in as an accountant with normal admin-level platform access and Cash Vault entry permission.
2. Open the small Help-menu Cash Vault option for the selected company.
3. Submit a deposit entry.
4. Submit a withdrawal entry.
5. Attempt any other transaction type.

Expected outcome: deposit and withdrawal succeed in INR, unsupported transaction types fail, no Plaid account connection is required, and hidden account names, balances, and history are not shown in the entry flow.

### 3. Accountant cannot see hidden account details through normal navigation

1. Keep the accountant signed in.
2. Open normal account lists, banking account lists, account detail routes, and bank transaction history.
3. Try direct navigation/API access if test tooling supports it.

Expected outcome: hidden Cash Vault account data is absent or denied unless a valid full unlock applies.

### 4. Temporary full unlock for the two designated admins

1. As owner, configure two designated admins.
2. Grant a temporary full Cash Vault unlock to one designated admin.
3. Sign in as that admin and verify full Cash Vault access in the selected company.
4. Switch to another company.
5. Wait for expiry or set a short expiry in test data.
6. Attempt the same access after expiry.

Expected outcome: full access applies only to the selected company, only for the designated admin, and only before expiry.

### 5. Non-designated admin unlock rejection

1. As owner, attempt to grant temporary full Cash Vault access to a normal admin who is not one of the two designated admins.

Expected outcome: request fails and audit records a denied unlock attempt.

### 6. Audit trail

Validate audit records exist for:

- Cash Vault account designation changes
- Cash Vault entry creation
- temporary unlock grant/revoke/expiry use
- denied entry, denied management, and denied direct detail/history attempts

Expected outcome: each audit record includes user, company, action, target where available, outcome, and timestamp.

### 7. INR expense-sheet import

1. Use `/Users/kmsh/Developer/sure/docs/schemas/Format for Exp Sheet.xlsx` as the schema reference.
2. Create a test workbook containing any subset of these columns: Vendor's Name, Bill No, Item Description, Bill Date, Basic Value, GST, Freight Other, Total Bill Value, GST on RCM, TDS Deducted, LF & Intt, Date, Mode of Payment, Payment, Balance Payable, Remarks.
3. Sign in as an accountant with normal admin-level platform access.
4. Upload the workbook through the normal import flow for the selected company.
5. Map uploaded columns to the approved schema.
6. Preview validation results.
7. Commit accepted rows.

Expected outcome: recognized columns are imported as INR values, unsupported columns are reported or ignored, invalid rows show row-level errors, accepted rows commit without Plaid-linked accounts, and no partial records are created for rejected rows.

## Suggested Verification Commands

Run focused checks first, then broader checks:

```bash
nvm use 18.16.1
pnpm --filter @bigcapital/server test -- CashVault
pnpm --filter @bigcapital/server test -- ExpenseSheet
pnpm --filter @bigcapital/server typecheck
pnpm --filter @bigcapital/webapp typecheck
pnpm build:server
pnpm build:webapp
```

If end-to-end coverage is added:

```bash
pnpm test:e2e -- cash-vault
```
