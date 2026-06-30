# Bookeepz Preference Prefill Design

Date: 2026-06-30

## Purpose

Bookeepz local deployment should start the four managed organizations with the core preferences needed for normal, non-vault expense-entry work. The prefill must reduce manual setup in `/preferences/general`, `/preferences/accountant`, and `/preferences/items` without changing Cash Vault behavior or overwriting choices already made by an admin.

The behavior applies only to the four Bookeepz bootstrap organizations:

- `risingstone_infra_pvt_ltd`
- `risingstone_ventures_pvt_ltd`
- `risingstone_projects_pvt_ltd`
- `mahetel_pvt_ltd`

## Context

The screenshots show the intended General defaults:

- Base currency: `INR - Indian Rupee`
- Fiscal year: `April - March`
- Language: `English`
- Time zone: `Asia/Kolkata (IST) +05:30`
- Date format: `30/06/26 [DD/MM/YY]`

The provided workbook schema is the approved non-vault expense sheet schema:

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

The current non-vault expense sheet import creates normal Expense transactions. It injects the per-organization Bookeepz default expense account as the expense category account, then resolves an active non-vault bank or cash account as the payment account. It does not use the Items preference defaults to post expense sheet rows, and it does not use Cash Vault accounts for normal imports.

## Current Code Paths

The relevant preference routes are configured in:

- `packages/webapp/src/routes/preferences.tsx`
- `packages/webapp/src/constants/preferencesMenu.tsx`
- `packages/webapp/src/containers/Preferences/DefaultRoute.tsx`

The General page reads and writes tenant metadata through:

- `packages/webapp/src/containers/Preferences/General/GeneralForm.tsx`
- `packages/webapp/src/containers/Preferences/General/GeneralFormPage.tsx`
- `packages/webapp/src/containers/Preferences/General/GeneralFormProvider.tsx`
- `shared/sdk-ts/src/organization.ts`
- `packages/server/src/modules/Organization/Organization.controller.ts`
- `packages/server/src/modules/Organization/commands/UpdateOrganization.service.ts`

The Accountant and Items pages read and write generic settings through:

- `packages/webapp/src/containers/Preferences/Accountant/*`
- `packages/webapp/src/containers/Preferences/Item/*`
- `packages/webapp/src/hooks/query/settings/queries.ts`
- `shared/sdk-ts/src/settings.ts`
- `packages/server/src/modules/Settings/Settings.controller.ts`
- `packages/server/src/modules/Settings/commands/SaveSettings.service.ts`
- `packages/server/src/constants/metable-options.ts`

The deployment/bootstrap place that already knows the four organizations and their normal Bookeepz accounts is:

- `packages/server/src/modules/CLI/commands/LocalBookeepzBootstrap.command.ts`

## Design

Add a Bookeepz preference-default step to the local deployment/bootstrap flow. The step should run for each of the four bootstrap organizations after the tenant database and normal Bookeepz accounts exist.

The prefill operation must be idempotent and non-destructive:

- If a tenant metadata column or setting key is missing, null, undefined, or blank, fill it.
- If a tenant metadata column or setting key already has a non-blank value, preserve it.
- Do not update unrelated settings.
- Do not use or modify Cash Vault accounts.

### General Defaults

Fill missing tenant metadata values:

| Field | Value |
| --- | --- |
| `name` | Organization display name from `BOOTSTRAP_BUSINESSES` |
| `baseCurrency` | `INR` |
| `location` | `IN` |
| `language` | `en` |
| `timezone` | `Asia/Kolkata` |
| `dateFormat` | `DD/MM/YY` |
| `fiscalYear` | `april` |

`fiscalYear=april` represents April to March. `dateFormat=DD/MM/YY` matches the screenshot's day-first option and is one of the server-supported persisted date-format tokens.

### Accountant Defaults

Fill missing settings:

| Group | Key | Value |
| --- | --- | --- |
| `organization` | `accounting_basis` | `accrual` |
| `accounts` | `account_code_unique` | `true` |
| `accounts` | `account_code_required` | `false` |
| `bill_payments` | `withdrawal_account` | The organization's normal Bookeepz payment account id |

Use `accrual` because the workbook includes bill dates, bill references, total bill values, payments, and balances payable. That source shape is closer to obligation tracking than pure cash-only recognition. This does not change the current import implementation, which still creates normal Expense transactions.

Leave these settings blank unless already configured:

| Group | Key | Reason |
| --- | --- | --- |
| `payment_receives` | `preferred_deposit_account` | Customer receipt workflows are outside this expense-entry setup. |
| `payment_receives` | `preferred_advance_deposit` | Customer advance workflows are outside this expense-entry setup. |

### Items Defaults

Fill missing settings:

| Group | Key | Value |
| --- | --- | --- |
| `items` | `preferred_cost_account` | The organization's normal Bookeepz expense account id |

Leave these settings blank unless already configured:

| Group | Key | Reason |
| --- | --- | --- |
| `items` | `preferred_sell_account` | Sales item workflows are outside this expense-entry setup. |
| `items` | `preferred_inventory_account` | Inventory item workflows are outside this expense-entry setup. |

The Items page marks all three labels as visually required, but its schema permits null values. For this Bookeepz deployment, only the cost account is semantically valid for the normal expense-entry workflow.

## Cash Vault Boundary

This design does not change Cash Vault account selection, unlock behavior, endpoint behavior, or scoped route behavior.

Normal non-vault expense imports should keep using:

- normal Bookeepz expense account for the expense category
- normal Bookeepz payment account for the payment side

Cash Vault entries should keep using the current Cash Vault route and account handling.

## Error Handling

The prefill step should fail clearly if a required normal Bookeepz account cannot be found for an organization:

- missing normal expense account for `items.preferred_cost_account`
- missing normal payment account for `bill_payments.withdrawal_account`

Failure output must identify the organization id and missing account type, without printing secrets or sensitive values.

The step should not fail because optional sales, inventory, or customer receipt defaults are absent.

## Testing

Add focused server tests around the prefill helper or bootstrap command:

- fills missing General metadata for all four organizations
- preserves existing non-blank General metadata
- fills missing Accountant settings with accrual basis, account-code settings, and normal payment account
- preserves existing Accountant settings
- fills only `items.preferred_cost_account` for Items settings
- preserves existing Items settings
- leaves Cash Vault account settings and routes unchanged
- fails with an actionable error when required normal Bookeepz accounts are missing

Run the existing readiness path after implementation:

- `./setup.sh start-local`
- `./setup.sh readiness`

Then verify in the browser:

- `/preferences/general`
- `/preferences/accountant`
- `/preferences/items`

The UI should show the expected values for the current organization and should not show Cash Vault accounts as normal defaults.

## Implementation Plan Handoff

After this design is approved, create an implementation plan that keeps the work scoped to bootstrap-time defaults and verification. Do not redesign the Preferences UI, the Excel import schema, or Cash Vault behavior as part of this change.
