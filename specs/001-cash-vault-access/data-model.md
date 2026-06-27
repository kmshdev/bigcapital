# Data Model: Cash Vault Access

## Account Extension

Existing tenant account records gain Cash Vault classification.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `is_cash_vault` | boolean | yes | Defaults to false. True only for eligible cash accounts. |
| `cash_vault_entry_enabled` | boolean | yes | Defaults to false. At most one Cash Vault account per tenant can be the Help-menu entry target. |
| `cash_vault_designated_at` | datetime | no | Set when an owner marks the account as Cash Vault. |
| `cash_vault_designated_by_user_id` | integer | no | User who marked the account as Cash Vault. |

### Validation

- Only cash accounts can be marked as Cash Vault.
- Only Cash Vault accounts can be marked as the Help-menu entry target.
- At most one active Help-menu entry target is allowed per tenant.
- Marking or unmarking a Cash Vault account requires Cash Vault management access.
- Cash Vault accounts remain normal accounts for ledger/reporting purposes, but hidden for ordinary account/banking reads.

### Indexes

- `(is_cash_vault, account_type)` for filtered account and banking account lists.
- `(cash_vault_entry_enabled, is_cash_vault)` for server-side Help-menu target resolution.

## CashVaultUnlock

Tenant-local table for temporary full Cash Vault access.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | integer | yes | Primary key. |
| `user_id` | integer | yes | One of the two designated admins. |
| `granted_by_user_id` | integer | yes | Owner admin who granted the unlock. |
| `expires_at` | datetime | yes | Access is inactive at or after this time. |
| `revoked_at` | datetime | no | Optional manual revocation. |
| `revoked_by_user_id` | integer | no | Owner admin who revoked the unlock. |
| `created_at` | datetime | yes | Audit support. |
| `updated_at` | datetime | yes | Audit support. |

### Validation

- `user_id` must belong to the current tenant.
- `user_id` must be one of the two designated admins.
- `granted_by_user_id` must be an owner admin in the current tenant.
- `expires_at` must be in the future when created.
- Active unlock means `revoked_at` is null and `expires_at` is greater than current time.

### Indexes

- `(user_id, expires_at, revoked_at)` for active unlock checks.
- `(expires_at)` for cleanup/reporting.

## CashVaultPermission

Logical permission represented in the existing role/ability system rather than a new table.

| Subject | Action | Purpose |
|---|---|---|
| `CashVault` | `Manage` | Owner-only management of Cash Vault accounts, designated admins, and unlocks. |
| `CashVault` | `Entry` | Accountant Help-menu deposit/withdrawal entry. |
| `CashVault` | `View` | Full Cash Vault visibility while an eligible unlock is active. |

### Validation

- Normal admin-level platform access does not imply any Cash Vault action.
- Cash Vault `View` through unlock is valid only for the selected tenant and only until expiry.

## CashVaultEntry

Request-level entity for accountant deposit/withdrawal entry. It delegates to existing cashflow transaction persistence.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `transactionType` | enum | yes | `deposit` or `withdrawal` only. |
| `amount` | decimal | yes | Must be positive. |
| `date` | date | yes | Posting date. |
| `description` | string | yes | Required for audit clarity. |
| `referenceNo` | string | no | Optional external reference. |
| `offsetAccountId` | integer | yes | Counterparty account used by existing cashflow transaction creation. |
| `branchId` | integer | no | Existing branch support where enabled. |

### Validation

- Accountants can create only `deposit` and `withdrawal`.
- Accountant Help-menu requests do not include the hidden Cash Vault account id; the server resolves the tenant's `cash_vault_entry_enabled` account.
- Accountants cannot use this payload to view account details, balances, or history.
- Resolved Cash Vault account and offset account must belong to the selected tenant.
- Invalid entries must fail before creating cashflow transactions.
- Currency is INR for this feature; Plaid fields are not required and must not be surfaced in the accountant Help-menu flow.

## ExpenseSheetImport

Tenant-local import record for the India expense-sheet workbook flow. It should reuse Bigcapital's existing import lifecycle where possible.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `id` | integer | yes | Primary key or existing import id, depending on implementation reuse. |
| `uploaded_by_user_id` | integer | yes | Accountant/admin who uploaded the workbook. |
| `status` | enum | yes | `uploaded`, `mapped`, `validated`, `committed`, `failed`. |
| `currency_code` | string | yes | Must be `INR`. |
| `source_filename` | string | yes | Uploaded workbook filename. |
| `mapping` | json | yes | Maps uploaded columns to approved schema columns. |
| `created_at` | datetime | yes | Audit support. |
| `updated_at` | datetime | yes | Audit support. |

### Approved Schema Columns

The approved schema comes from `/Users/kmsh/Developer/sure/docs/schemas/Format for Exp Sheet.xlsx` sheet `Sheet1`.

| Canonical Field | Workbook Header | Type | Required |
|---|---|---|---:|
| `vendor_name` | `Vendor's Name` | string | no |
| `bill_no` | `Bill No` | string | no |
| `item_description` | `Item Description` | string | no |
| `bill_date` | `Bill Date` | date | no |
| `basic_value` | `Basic Value` | INR decimal | no |
| `gst` | `GST` | INR decimal | no |
| `freight_other` | `Freight Other` | INR decimal | no |
| `total_bill_value` | `Total Bill Value` | INR decimal | no |
| `gst_on_rcm` | `GST on RCM` | INR decimal | no |
| `tds_deducted` | `TDS Deducted` | INR decimal | no |
| `lf_and_intt` | `LF & Intt` | INR decimal | no |
| `payment_date` | `Date` | date | no |
| `mode_of_payment` | `Mode of Payment` | string | no |
| `payment` | `Payment` | INR decimal | no |
| `balance_payable` | `Balance Payable` | INR decimal | no |
| `remarks` | `Remarks` | string | no |

### Validation

- Uploaded workbooks may include any subset of approved schema columns.
- Unsupported columns are ignored or reported during preview, not committed as accounting values.
- Monetary values must parse as INR decimals and must fail closed for invalid booleans, dates, or text values.
- Row-level errors must be reported before commit.
- Accepted rows must not require Plaid account ids or Plaid transaction ids.

## ExpenseSheetRow

Parsed row from an expense-sheet import.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `import_id` | integer | yes | Parent import. |
| `row_number` | integer | yes | Source workbook row number. |
| `values` | json | yes | Canonical field values for recognized columns. |
| `validation_errors` | json | no | Row-level validation failures. |
| `committed_transaction_id` | integer | no | Accounting transaction produced after commit, where applicable. |

## Designated Admin

The two designated admins are tenant-local records for temporary full unlock eligibility.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `user_id` | integer | yes | Tenant user eligible for temporary full unlock. |
| `designated_by_user_id` | integer | yes | Owner admin who designated the user. |
| `created_at` | datetime | yes | Audit support. |

### Validation

- Maximum of two active designated admins per tenant.
- Designated admins must remain tenant members.
- Removing a designated admin invalidates active unlocks for that user.

## Audit Event

Use the existing audit log/event subscriber pattern for Cash Vault actions.

Required audit context:

- Tenant/company id
- Acting user id
- Action name
- Target account/unlock/entry id when available
- Outcome: allowed, denied, created, updated, revoked, expired
- Timestamp

## Relationships

- Company/tenant has many Cash Vault accounts.
- Company/tenant has at most one Help-menu Cash Vault entry target.
- Company/tenant has up to two designated admins.
- Designated admin can have many unlocks, but only active, unexpired unlocks grant access.
- Cash Vault entry creates or delegates to an existing cashflow transaction.
- Company/tenant has many expense-sheet imports.
- Expense-sheet import has many parsed rows.
- Audit events reference Cash Vault account, unlock, or entry actions where applicable.

## State Transitions

### Cash Vault Account

`normal` -> `cash_vault` when owner marks eligible cash account.

`cash_vault` -> `normal` only by owner management action and only after visibility/audit checks pass.

### Cash Vault Unlock

`active` when created for a designated admin with future expiry.

`expired` automatically when current time reaches `expires_at`.

`revoked` when owner revokes before expiry.

### Cash Vault Entry

`draft/request` in UI -> `validated` by Cash Vault endpoint -> `posted` by existing cashflow transaction path -> `audited` by Cash Vault/audit events.

### Expense Sheet Import

`uploaded` -> `mapped` -> `validated` -> `committed`.

`uploaded`, `mapped`, or `validated` -> `failed` when file parsing, mapping, or row validation blocks commit.
