import { Injectable } from '@nestjs/common';
import { AuditLogService } from '@/modules/AuditLogs/AuditLog.service';
import { AbilitySubject } from '@/modules/Roles/Roles.types';

type CashVaultAuditBaseParams = {
  action: string;
  tenantId: number;
  subjectId?: number | null;
  targetType?: string;
  metadata?: Record<string, unknown>;
};

type CashVaultDeniedAuditParams = CashVaultAuditBaseParams & {
  reason: string;
};

@Injectable()
export class CashVaultAuditService {
  constructor(private readonly auditLog: AuditLogService) {}

  public async recordAllowed(params: CashVaultAuditBaseParams) {
    await this.record({
      ...params,
      outcome: 'allowed',
    });
  }

  public async recordDenied(params: CashVaultDeniedAuditParams) {
    await this.record({
      ...params,
      outcome: 'denied',
      metadata: {
        ...(params.metadata ?? {}),
        reason: params.reason,
      },
    });
  }

  private async record(
    params: CashVaultAuditBaseParams & { outcome: 'allowed' | 'denied' },
  ) {
    await this.auditLog.record({
      action: params.action,
      subject: AbilitySubject.CashVault,
      subjectId: params.subjectId ?? null,
      metadata: {
        outcome: params.outcome,
        tenantId: params.tenantId,
        ...(params.targetType ? { targetType: params.targetType } : {}),
        ...(params.metadata ?? {}),
      },
    });
  }
}
