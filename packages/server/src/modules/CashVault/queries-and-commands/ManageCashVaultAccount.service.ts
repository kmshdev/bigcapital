import { Injectable } from '@nestjs/common';
import { AccountRepository } from '@/modules/Accounts/repositories/Account.repository';
import { CashVaultAuditService } from '../CashVaultAudit.service';

type DesignateCashVaultAccountParams = {
  accountId: number;
  entryEnabled?: boolean;
  userId?: number;
};

@Injectable()
export class ManageCashVaultAccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly cashVaultAudit?: CashVaultAuditService,
  ) {}

  public async listAccounts() {
    return this.accountRepository.listCashVaultAccounts();
  }

  public async designateAccount(params: DesignateCashVaultAccountParams) {
    const account = await this.accountRepository.findById(params.accountId);
    if (!account || account.accountType !== 'cash') {
      throw new Error('Only cash accounts can be marked as Cash Vault.');
    }
    if (params.entryEnabled) {
      await this.accountRepository.clearEntryTargets();
    }
    const updated = await this.accountRepository.markCashVault({
      accountId: params.accountId,
      entryEnabled: Boolean(params.entryEnabled),
      userId: params.userId,
    });
    await this.cashVaultAudit?.recordAllowed?.({
      action: 'cash_vault.account.designated',
      tenantId: 0,
      subjectId: params.accountId,
      targetType: 'account',
    });
    return updated;
  }

  public async removeDesignation(accountId: number) {
    const updated =
      await this.accountRepository.removeCashVaultDesignation(accountId);
    await this.cashVaultAudit?.recordAllowed?.({
      action: 'cash_vault.account.removed',
      tenantId: 0,
      subjectId: accountId,
      targetType: 'account',
    });
    return updated;
  }
}
