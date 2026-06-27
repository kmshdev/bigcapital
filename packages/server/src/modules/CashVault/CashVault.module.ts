import { Module } from '@nestjs/common';
import { CashVaultApplicationService } from './CashVaultApplication.service';
import { CashVaultController } from './CashVault.controller';
import { AuditLogsModule } from '../AuditLogs/AuditLogs.module';
import { CashVaultAuditService } from './CashVaultAudit.service';
import { ManageCashVaultAccountService } from './queries-and-commands/ManageCashVaultAccount.service';
import { AccountsModule } from '../Accounts/Accounts.module';
import { CreateCashVaultEntryService } from './queries-and-commands/CreateCashVaultEntry.service';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { ManageCashVaultUnlockService } from './queries-and-commands/ManageCashVaultUnlock.service';
import { CashVaultPasswordVerifierService } from './queries-and-commands/CashVaultPasswordVerifier.service';
import { CashVaultChallengeService } from './queries-and-commands/CashVaultChallenge.service';
import { CashVaultAccessModule } from './CashVaultAccess.module';

@Module({
  imports: [
    CashVaultAccessModule,
    AuditLogsModule,
    AccountsModule,
    BankingTransactionsModule,
  ],
  providers: [
    CashVaultApplicationService,
    CashVaultAuditService,
    ManageCashVaultAccountService,
    CreateCashVaultEntryService,
    ManageCashVaultUnlockService,
    CashVaultPasswordVerifierService,
    CashVaultChallengeService,
  ],
  controllers: [CashVaultController],
  exports: [CashVaultAccessModule, CashVaultAuditService],
})
export class CashVaultModule {}
