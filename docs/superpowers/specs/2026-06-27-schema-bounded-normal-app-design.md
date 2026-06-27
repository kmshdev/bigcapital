# Schema-Bounded Normal App Design

## Purpose

The normal Bigcapital app surface for the four Bookeepz companies is defined by the approved expense-sheet schema. The app should expose only the business workflows needed to manually enter, import, review, post, pay, and report vendor expense data. Hidden Cash Vault remains separate and must not become part of the normal visible UI.

The approved schema fields are:

- `Vendor's Name`
- `Bill No`
- `Item Description`
- `Bill Date`
- `Basic Value`
- `GST`
- `Freight Other`
- `Total Bill Value`
- `GST on RCM`
- `TDS Deducted`
- `LF & Intt`
- `Date`
- `Mode of Payment`
- `Payment`
- `Balance Payable`
- `Remarks`

## Product Boundary

The normal visible app is a schema-bounded purchase and expense system. It is not a full generic accounting installation for these users.

Visible to owner admins and accountants:

- Homepage or dashboard focused on vendor bills, payments, expenses, payable balances, and import status.
- Expense Sheet Import as the primary entry path.
- Manual entry through Vendors, Bills, Payments Made, Expenses, and Tax Rates remains available.
- Vendors.
- Bills.
- Payments Made.
- Expenses.
- Tax Rates.
- Reports limited to payable, vendor, expense, and ledger proof views.
- Preferences limited to company, user, tax, and required account setup.

Visible to owner admins only:

- Minimal Chart of Accounts setup or filtered account configuration.
- Report views that expose ledger-level detail.
- Company/user/preference setup.

Hidden from normal UI:

- Sales, estimates, invoices, receipts, payment received.
- Customers.
- Products, services, inventory, warehouses, and inventory adjustments.
- Banking, Plaid, cashflow feeds, bank rules, and feed-based cashflow account workflows.
- Manual journals and transaction locking for accountants.
- Full Chart of Accounts as a routine accountant-facing page.
- Equity section and broad accounting account-management views.
- Cash Vault, except through the existing hidden gated paths.

## Existing Tables And Models To Keep

The backend schema must keep the ledger tables and purchase-side tables even when their UI is narrowed.

Required for the normal schema-driven flow:

- `contacts`: vendor records. `Vendor's Name` maps to vendor contact display name with `contact_service = vendor`.
- `bills`: purchase invoice header. Required columns include `bill_number`, `bill_date`, `due_date`, `reference_no`, `amount`, `payment_amount`, `tax_amount_withheld`, `discount`, `adjustment`, and `note`.
- `items_entries`: bill line rows. Required columns include `description`, `quantity`, `rate`, `cost_account_id`, `tax_rate_id`, `tax_rate`, and `is_inclusive_tax`.
- `bills_payments`: vendor payment header. Required columns include `vendor_id`, `amount`, `payment_account_id`, `payment_number`, `payment_date`, `payment_method`, `reference`, and `statement`.
- `bills_payments_entries`: bill payment allocation rows. Required columns include `bill_id` and `payment_amount`.
- `expenses_transactions`: direct expense transaction header. Required columns include `payment_account_id`, `payee_id`, `reference_no`, `total_amount`, `payment_date`, and `description`.
- `expense_transaction_categories`: expense split rows. Required columns include `expense_account_id`, `amount`, and `description`.
- `tax_rates`: GST rate setup. Required columns include `name`, `code`, `rate`, `is_non_recoverable`, `is_compound`, and `active`.
- `tax_rate_transactions`: posted tax references. Required columns include `tax_rate_id`, `reference_type`, `reference_id`, `rate`, and `tax_account_id`.
- `accounts`: account definitions needed by purchase, payment, expense, tax, and ledger posting.
- `accounts_transactions`: generated ledger proof for bills, payments, expenses, and taxes.

## Account Type Policy

Backend account types that should remain available for posting and reports:

- `bank`
- `cash`
- `accounts-payable`
- `tax-payable`
- `expense`
- `other-expense`
- `other-current-asset`

Backend-only account types that may remain for framework assumptions, reports, and existing Bigcapital flows, but should not be exposed as normal user workflows:

- `accounts-receivable`
- `income`
- `other-income`
- `equity`

Unsupported normal-app account and feature surfaces should be hidden from navigation and routine creation flows rather than deleted from the database schema. Ledger correctness and Bigcapital internals depend on accounts and account transactions continuing to exist.

## UI Field Mapping

The normal UI should use the workbook language wherever practical. These labels apply to both spreadsheet import and manual entry. The spreadsheet is an allowed bulk-input path, not the only way to use the app.

| Workbook field | UI surface | Backend mapping |
| --- | --- | --- |
| `Vendor's Name` | Vendors, import preview, bill/payment tables | `contacts.display_name` |
| `Bill No` | Bills, import preview, payment allocation | `bills.bill_number` |
| `Item Description` | Bill line table and import preview | `items_entries.description` |
| `Bill Date` | Bills | `bills.bill_date` |
| `Basic Value` | Bill line amount before tax | `items_entries.quantity` and `items_entries.rate` |
| `GST` | Tax Rates and bill line tax | `tax_rates`, `items_entries.tax_rate_id`, `tax_rate_transactions` |
| `Freight Other` | Bill adjustment or expense/other-expense line | `bills.adjustment` or expense category |
| `Total Bill Value` | Bill total | `bills.amount` |
| `GST on RCM` | Import preview and configured tax/expense posting | configured RCM GST account behavior |
| `TDS Deducted` | Import preview and configured expense/payable posting | configured TDS account behavior |
| `LF & Intt` | Expense category | configured late fee/interest expense account |
| `Date` | Payment or expense date | `bills_payments.payment_date` or `expenses_transactions.payment_date` |
| `Mode of Payment` | Payment Made | `bills_payments.payment_method` |
| `Payment` | Payment Made and bill allocation | `bills_payments.amount`, `bills_payments_entries.payment_amount` |
| `Balance Payable` | Derived display | `bills.amount - bills.payment_amount - credited_amount` |
| `Remarks` | Notes and descriptions | `bills.note`, `bills_payments.statement`, or expense description |

`Balance Payable` is always derived by the app. The importer can display the spreadsheet value for comparison, but it must not trust it as the source of ledger truth.

## Quick New

The Quick New menu should stop acting as a generic creation menu for unsupported business objects.

Required normal-app behavior:

- Show `Import Expense Sheet` as the primary Quick New action.
- Keep manual creation shortcuts for supported schema-bound records: Vendor, Bill, Payment Made, Expense, and Tax Rate.
- Clicking it opens a file picker or import dialog for the approved spreadsheet schema.
- The action routes into the same `/expenses/sheet-import` workflow and backend import APIs as the full import page.
- Recognized columns are auto-mapped.
- Unsupported columns are shown before posting.
- Parsed rows are previewed, validated, and then posted into the purchase/expense/payment model.

Quick New is a shortcut into the canonical import flow, not a separate importer.

Manual Quick New actions should route to the existing supported forms with schema-bounded labels and fields. Unsupported actions such as customer, invoice, receipt, inventory, sales, banking/Plaid, and manual journal creation should not appear in Quick New.

## Manual Entry Model

Manual entry remains a first-class workflow for the normal app.

- Vendors can be created and edited directly.
- Bills can be created and edited directly using the schema-bounded bill fields.
- Payments Made can be created and edited directly and allocated to bills.
- Expenses can be created and edited directly using supported expense categories.
- Tax Rates can be created and edited directly for GST handling.
- Manual forms should use the same validation and posting rules as imported rows where the fields overlap.
- Manual entry screens should not expose unsupported sales, inventory, banking, customer, or hidden Cash Vault controls.

## Posting Model

For each spreadsheet row, the import flow creates a posting plan before mutating data:

All approved workbook fields are nullable. Empty cells do not fail the whole row. The importer should populate only the sections that have enough data, and it should skip rows that have no transaction value of any kind.

1. Classify the row by available values before validation.
2. Skip the row when it has no usable vendor, bill, expense, tax, payment, note, or amount signal.
3. Resolve or stage the vendor from `Vendor's Name` when vendor data is present.
4. Resolve an existing bill by `vendorName + billNo` when both values exist, or create a bill when the row has enough bill data.
5. Populate bill header values from available `Bill No`, `Bill Date`, `Total Bill Value`, and `Remarks` values.
6. Populate bill line values from available `Item Description`, `Basic Value`, `GST`, and `Freight Other` values.
7. Resolve GST through `tax_rates` and bill item tax fields when GST data is present.
8. Represent `GST on RCM`, `TDS Deducted`, and `LF & Intt` through configured expense/tax/payable accounts when those values are present.
9. If payment data is present, create or update Payment Made with available `Date`, `Mode of Payment`, and `Payment` values and allocate it to a bill when a matching bill can be resolved.
10. Recalculate `Balance Payable` from posted bill and payment data whenever a bill exists.

The preview must show what will be created or updated before posting.

## Permissions

Owner admins and accountants share the same normal operational surface, but admin-only setup remains separate.

Owner admins:

- Can use all normal schema-driven workflows.
- Can manage minimal setup surfaces such as Tax Rates, configured posting accounts, company preferences, users, and selected ledger reports.
- Can access hidden Cash Vault through the separate gated owner path.

Accountants:

- Can use normal schema-driven workflows.
- Can import, preview, and post approved expense-sheet rows if granted normal operational permission.
- Cannot access hidden Cash Vault management or history.
- Cannot access full Chart of Accounts management, manual journals, broad account settings, or unsupported sales/inventory/banking features.

## Validation And Error Handling

The import flow must validate rows before posting:

- Unknown headers are rejected or displayed as unsupported before posting.
- Empty approved fields are allowed and should not block unrelated sections from posting.
- Rows with no usable transaction value are skipped and reported as skipped, not failed.
- Missing `Vendor's Name`, `Bill No`, `Bill Date`, or amount fields blocks only the section that requires that value.
- Duplicate bill detection uses `vendorName + billNo` only when both values exist.
- GST must map to an existing or created tax rate before posting GST-related amounts.
- `GST on RCM`, `TDS Deducted`, and `LF & Intt` require configured posting accounts only when those values are present.
- Payment posting requires payment amount and payment account resolution; payment date and mode should be populated when available.
- Balance mismatches are displayed as warnings; app-calculated balance remains authoritative.

Partial imports should be staged at the row level: valid rows may be posted only after the user confirms the preview and invalid rows remain clearly identified.

## Testing Requirements

Server tests:

- Header mapping accepts approved spreadsheet headers and rejects unsupported headers.
- Empty cells in approved columns do not fail parsing.
- Rows with no transaction value are skipped and reported.
- Row-to-posting-plan conversion maps each workbook field to the correct target.
- Row-to-posting-plan conversion creates partial vendor, bill, expense, tax, or payment actions only for sections with sufficient data.
- Duplicate bill detection uses `vendorName + billNo`.
- Posting account validation blocks TDS, RCM, and late fee rows when configured accounts are missing.
- Balance payable is recalculated and not trusted from input.

Webapp tests:

- Sidebar hides unsupported normal-app sections.
- Homepage hides unsupported cards and exposes only schema-bound workflow cards.
- Quick New shows `Import Expense Sheet` and routes into `/expenses/sheet-import`.
- Owner admin and accountant UI surfaces differ only where setup/Cash Vault permissions require it.

Browser validation:

- Owner admin sees Dashboard, Expense Sheet Import, Vendors, Bills, Payments Made, Expenses, Tax Rates, selected Reports, and limited Preferences.
- Accountant sees the operational schema-bound app and does not see Cash Vault management, full account management, sales, inventory, banking, customers, or manual journals.
- Quick New import path opens the approved spreadsheet import flow and previews mapped rows.
- Quick New manual actions open supported manual entry forms for Vendor, Bill, Payment Made, Expense, and Tax Rate.
- Existing manual entry flows remain usable for supported schema-bound records.

## Out Of Scope

- Deleting backend ledger tables or account types.
- Replacing the purchase, payment, expense, tax, and ledger services with a separate accounting engine.
- Making Cash Vault visible in normal navigation.
- Implementing unsupported sales, inventory, banking, or customer workflows for these companies.
