import { CashVaultAuditService } from './CashVaultAudit.service';

describe('CashVaultAuditService', () => {
  it('records allowed Cash Vault decisions with tenant, target, and metadata context', async () => {
    const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new CashVaultAuditService(auditLog as any);

    await service.recordAllowed({
      action: 'cash_vault.entry.created',
      subjectId: 40,
      tenantId: 7,
      targetType: 'entry',
      metadata: { amount: '100.00', currencyCode: 'INR' },
    });

    expect(auditLog.record).toHaveBeenCalledWith({
      action: 'cash_vault.entry.created',
      subject: 'CashVault',
      subjectId: 40,
      metadata: {
        outcome: 'allowed',
        tenantId: 7,
        targetType: 'entry',
        amount: '100.00',
        currencyCode: 'INR',
      },
    });
  });

  it('records denied Cash Vault decisions without exposing hidden account details', async () => {
    const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new CashVaultAuditService(auditLog as any);

    await service.recordDenied({
      action: 'cash_vault.account.view_denied',
      tenantId: 7,
      reason: 'cash_vault_view_permission_required',
    });

    expect(auditLog.record).toHaveBeenCalledWith({
      action: 'cash_vault.account.view_denied',
      subject: 'CashVault',
      subjectId: null,
      metadata: {
        outcome: 'denied',
        tenantId: 7,
        reason: 'cash_vault_view_permission_required',
      },
    });
  });
});
