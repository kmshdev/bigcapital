# Feature Specification: Cash Vault Access

**Feature Branch**: `develop`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Add a narrow tenant-local Cash Vault capability to Bigcapital using the existing company/workspace membership model. Owner admins can manage hidden cash vault accounts and grant temporary access. Accountants can make controlled entry-only cash vault writes without seeing hidden account details or history. Existing account and banking views should hide cash vault accounts unless the user has explicit access."

## Clarifications

### Session 2026-06-27

- Q: What Cash Vault entry types can accountants create in v1? -> A: Accountants can create Cash Vault deposit and withdrawal entries only.
- Q: How should accountants reach the hidden Cash Vault entry flow without normal account visibility? -> A: Accountants use a small Help-menu option for each business to infuse a Cash Vault transaction; ordinary platform access remains separate from hidden cash account visibility.
- Q: Can accountants have normal admin-level platform access while Cash Vault stays protected? -> A: Accountants may have normal admin-level platform access, but Cash Vault visibility and management are still separate.
- Q: What access can temporary unlocks grant? -> A: Temporary unlocks can allow full Cash Vault access for the selected company until expiry for the two designated admins.
- Q: What localization and import constraints apply to the normal accounting flow? -> A: Accounting must migrate from USD/Plaid assumptions to INR with no Plaid dependency, and accountants can import expense sheets using any subset of the schema columns from `Format for Exp Sheet.xlsx`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owner manages hidden cash vault accounts (Priority: P1)

An owner admin for a company can mark cash accounts as Cash Vault accounts, keep them hidden from normal account and banking views, and manage who can perform limited Cash Vault activity for that company.

**Why this priority**: Cash Vault protection depends first on owners being able to designate sensitive cash accounts without exposing them to normal staff workflows.

**Independent Test**: Can be fully tested by signing in as an owner admin for one company, designating a cash account as Cash Vault, and confirming that normal account and banking views no longer reveal that account to users without Cash Vault management access.

**Acceptance Scenarios**:

1. **Given** an owner admin belongs to a company with cash accounts, **When** the owner marks a cash account as Cash Vault, **Then** that account is hidden from ordinary account lists, banking lists, and account selection flows for users without Cash Vault access in that company.
2. **Given** an owner admin manages multiple companies, **When** the owner switches companies, **Then** Cash Vault settings and visibility apply only to the selected company.
3. **Given** a non-owner user attempts to manage Cash Vault settings, **When** the user opens or submits the management flow, **Then** the system denies the action without revealing hidden account details.

---

### User Story 2 - Accountant records entry-only Cash Vault activity (Priority: P2)

An accountant assigned to a company can have normal admin-level platform access and still record approved Cash Vault entries only from a small Help-menu option, without gaining direct cash account visibility or access to Cash Vault transaction history.

**Why this priority**: The accountant workflow is the main business need for controlled delegation while preserving privacy and financial separation.

**Independent Test**: Can be fully tested by signing in as an accountant, using the Help-menu Cash Vault option for the current company, creating an allowed Cash Vault entry, and confirming the accountant cannot view Cash Vault account balances, details, or transaction history through normal account or banking navigation.

**Acceptance Scenarios**:

1. **Given** an accountant has Cash Vault entry permission for a company, **When** the accountant submits a valid Cash Vault deposit or withdrawal entry, **Then** the entry is accepted for that company and recorded as normal financial activity without exposing the hidden account details to the accountant.
2. **Given** an accountant has no Cash Vault entry permission for a company, **When** the accountant attempts to submit a Cash Vault entry, **Then** the system rejects the action and states that permission is required.
3. **Given** an accountant has Cash Vault entry permission, **When** the accountant opens account details, banking account details, account transaction history, or banking transaction history, **Then** Cash Vault accounts and related history remain hidden unless separate explicit access has been granted.
4. **Given** an accountant has access to multiple companies, **When** the accountant uses the Help-menu Cash Vault option, **Then** the entry flow applies only to the currently selected company.

---

### User Story 3 - Temporary unlocks are scoped and expire (Priority: P3)

An owner admin can grant temporary full Cash Vault access for the selected company to one of the two designated admins, and that access expires automatically.

**Why this priority**: Temporary unlocks let owners handle exceptional review or correction cases for trusted admins without turning Cash Vault access into a permanent broad role.

**Independent Test**: Can be fully tested by granting a temporary unlock to one of the two designated admins, confirming full Cash Vault access works only in the selected company, and confirming the same access fails after expiry.

**Acceptance Scenarios**:

1. **Given** an owner grants a temporary unlock to one of the two designated admins for one company and expiry time, **When** that admin accesses Cash Vault before expiry, **Then** the system allows full Cash Vault access within that company.
2. **Given** a temporary unlock exists for one company, **When** the same admin switches to another company, **Then** the unlock does not apply.
3. **Given** a temporary unlock has expired, **When** the admin attempts to access Cash Vault, **Then** the system denies access and requires a new unlock.
4. **Given** a user is not one of the two designated admins, **When** an owner attempts to grant temporary full Cash Vault access to that user, **Then** the system rejects the unlock.

---

### User Story 4 - Accountant imports INR expense sheets (Priority: P4)

An accountant with normal admin-level platform access can import an Excel expense sheet for the selected company using any subset of the approved expense-sheet schema columns, with imported values recorded in INR and no Plaid dependency.

**Why this priority**: The normal accounting flow must match the India expense-sheet workflow and cannot depend on USD/Plaid bank-account assumptions.

**Independent Test**: Can be fully tested by uploading a workbook containing any valid subset of the approved schema columns, mapping those columns, and confirming the accepted rows are previewed and imported as INR accounting data without requiring Plaid-linked accounts.

**Acceptance Scenarios**:

1. **Given** an accountant uploads an Excel file with a subset of approved expense-sheet columns, **When** the accountant maps and imports the file, **Then** the system accepts recognized columns and reports missing optional columns without rejecting the whole import.
2. **Given** an uploaded workbook contains unsupported columns, **When** the accountant previews the import, **Then** the system ignores or flags unsupported columns without corrupting recognized data.
3. **Given** an imported row contains monetary values, **When** the row is accepted, **Then** the amounts are treated as INR values and no Plaid account connection is required.
4. **Given** an uploaded row contains invalid date or monetary values, **When** the accountant attempts to import, **Then** the row is rejected with a clear error and no partial accounting entry is created for that row.

---

### Edge Cases

- A user who belongs to one company must never see or act on Cash Vault data from another company.
- Accounting and Cash Vault flows must not require Plaid-linked accounts.
- Currency display, storage, import validation, and generated entries for this feature must default to INR rather than USD.
- A user with general company administration access, including an accountant with normal admin-level platform access, must not see Cash Vault accounts in normal account, banking, or transaction history views unless Cash Vault-specific access applies.
- A Cash Vault account with existing transactions must remain hidden from normal views after it is marked as Cash Vault.
- A Cash Vault entry with invalid amount, date, account, or description must be rejected without creating partial financial records.
- Concurrent changes to Cash Vault access must not leave a user with broader access than the latest owner-approved state.
- Removing a user from a company must immediately prevent that user from using Cash Vault permissions or unlocks for that company.
- Expired unlocks must be treated as inactive even if a user keeps an old browser session open.
- The Help-menu Cash Vault option must not reveal hidden cash account names, balances, or transaction history while routing the accountant to the allowed entry flow.
- Temporary full Cash Vault access must be unavailable to users outside the two designated admins, even if they have normal admin-level platform access.
- Expense-sheet imports must handle missing optional schema columns, extra unsupported columns, blank cells, invalid dates, invalid monetary values, and duplicate bill references without crashing or creating partial records.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST treat each company/workspace boundary as the Cash Vault security boundary.
- **FR-002**: The system MUST allow owner admins to designate eligible cash accounts as Cash Vault accounts for the selected company.
- **FR-003**: The system MUST hide Cash Vault accounts from ordinary account lists, banking lists, account selectors, and transaction history views for users without Cash Vault-specific access.
- **FR-004**: The system MUST provide an owner-only Cash Vault management experience for designating Cash Vault accounts and managing Cash Vault access.
- **FR-005**: The system MUST provide an accountant-safe Cash Vault entry experience from a small Help-menu option that permits deposit and withdrawal entry creation without exposing Cash Vault balances, account details, or historical transactions.
- **FR-006**: The system MUST distinguish owner administration, general company administration, Cash Vault management, and Cash Vault entry permissions.
- **FR-007**: The system MUST reject Cash Vault management actions from users who are not owner admins for the selected company.
- **FR-008**: The system MUST reject Cash Vault entry actions from users who do not have Cash Vault entry permission or an active unlock for the selected company.
- **FR-009**: The system MUST record accepted Cash Vault entries as normal financial activity so company reports remain complete for authorized financial reporting.
- **FR-010**: The system MUST prevent accountants with entry-only access from viewing Cash Vault account details, balances, and transaction history.
- **FR-011**: The system MUST support temporary full Cash Vault unlocks scoped to one of the two designated admins, one company, and one expiry time.
- **FR-012**: The system MUST automatically treat expired Cash Vault unlocks as inactive.
- **FR-013**: The system MUST preserve Cash Vault restrictions when a user switches companies or sends a request for a different company.
- **FR-014**: The system MUST audit Cash Vault account designation changes, access changes, unlock grants, unlock expiry usage, denied access attempts, and accepted entries.
- **FR-015**: The system MUST present clear denial messages that explain the missing permission without disclosing hidden Cash Vault account data.
- **FR-016**: The system MUST keep existing non-Cash Vault account and banking workflows usable for users who have no Cash Vault permissions.
- **FR-017**: The system MUST reject accountant-created Cash Vault entry types other than deposits and withdrawals.
- **FR-018**: The system MUST keep the Help-menu Cash Vault entry path scoped to the currently selected company.
- **FR-019**: The system MUST keep Cash Vault visibility and management separate from normal admin-level platform access.
- **FR-020**: The system MUST reject temporary full Cash Vault unlocks for users who are not one of the two designated admins.
- **FR-021**: The system MUST default accounting, Cash Vault entries, and expense-sheet imports in this feature to INR.
- **FR-022**: The system MUST not require Plaid-linked accounts for Cash Vault entry, Cash Vault management, or expense-sheet import flows.
- **FR-023**: The system MUST support accountant Excel imports using any subset of the approved expense-sheet schema columns.
- **FR-024**: The approved expense-sheet schema MUST include these columns: Vendor's Name, Bill No, Item Description, Bill Date, Basic Value, GST, Freight Other, Total Bill Value, GST on RCM, TDS Deducted, LF & Intt, Date, Mode of Payment, Payment, Balance Payable, and Remarks.
- **FR-025**: The system MUST preview, validate, and report row-level errors for expense-sheet imports before committing accepted rows.

### Key Entities *(include if feature involves data)*

- **Company**: The workspace/business boundary that owns accounts, users, permissions, and Cash Vault data.
- **Company Member**: A user associated with a company with company-level access, including normal admin-level platform access where assigned.
- **Cash Vault Account**: A company cash account marked as sensitive and hidden from normal account and banking workflows unless Cash Vault access applies.
- **Cash Vault Permission**: A company-local permission that allows either Cash Vault management or entry-only Cash Vault activity.
- **Cash Vault Unlock**: A temporary full access grant scoped to one of the two designated admins, one company, and an expiry time.
- **Cash Vault Entry**: A controlled deposit or withdrawal submitted through the Help-menu Cash Vault entry workflow and recorded as company financial activity.
- **Expense Sheet Import**: An uploaded Excel workbook mapped against the approved India expense-sheet schema and imported into the selected company as INR accounting data.
- **Expense Sheet Row**: A parsed row from the workbook containing any recognized subset of vendor, bill, item, tax, payment, balance, date, and remarks fields.
- **Audit Event**: A durable record of Cash Vault access decisions, configuration changes, entry creation, and denied attempts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users without Cash Vault access are unable to discover Cash Vault accounts through ordinary account, banking, selector, detail, or history views during acceptance testing.
- **SC-002**: Owner admins can designate a Cash Vault account and verify restricted visibility in under 3 minutes for a company with existing cash accounts.
- **SC-003**: Accountants with entry-only access can submit an approved Cash Vault deposit or withdrawal entry from the Help-menu option in under 2 minutes without seeing Cash Vault balances, account details, or historical transactions.
- **SC-004**: Temporary unlocks are enforced by company, designated-admin eligibility, and expiry in 100% of tested allowed, non-designated-user, cross-company, and expired scenarios.
- **SC-005**: Every Cash Vault management action, entry action, unlock action, and denied access attempt produces an audit event with user, company, action, and time.
- **SC-006**: Existing non-Cash Vault account and banking workflows continue to pass their current acceptance checks for users without Cash Vault permissions.
- **SC-007**: Accountants can import an expense workbook with any valid subset of approved schema columns and see row-level validation results before commit.
- **SC-008**: 100% of accepted Cash Vault entries and imported expense-sheet monetary values are treated as INR and can be completed without Plaid.

## Assumptions

- Bigcapital's existing company/workspace membership model remains the source of company membership and company switching.
- Owner admins are company owners with tenant-local administrative rights.
- Accountants may have normal admin-level platform access across assigned companies, but hidden cash account access is available only through the Help-menu Cash Vault entry path for the selected company.
- Normal admin-level platform access does not automatically grant Cash Vault visibility or management.
- Cash Vault v1 is limited to cash accounts, accountant-created deposit and withdrawal entries, temporary full access unlocks for two designated admins, visibility filtering, and auditability.
- Full multi-step approval workflows, bank integrations, cash reconciliation redesigns, and broad business-entity management are out of scope for this feature.
- Existing authentication, company selection, permission enforcement, and financial posting mechanisms are reused where they already satisfy these requirements.
- The referenced workbook path with `.xlsx1` does not exist; the available schema workbook is `/Users/kmsh/Developer/sure/docs/schemas/Format for Exp Sheet.xlsx`.
