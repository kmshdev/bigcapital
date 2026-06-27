import { Module } from '@nestjs/common';
import { CashVaultApplicationService } from './CashVaultApplication.service';
import { CashVaultAccessService } from './CashVaultAccess.service';
import { CashVaultController } from './CashVault.controller';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { AuditLogsModule } from '../AuditLogs/AuditLogs.module';
import { CashVaultAuditService } from './CashVaultAudit.service';
import { CashVaultDesignatedAdmin } from './models/CashVaultDesignatedAdmin.model';
import { CashVaultUnlock } from './models/CashVaultUnlock.model';
import { ManageCashVaultAccountService } from './queries-and-commands/ManageCashVaultAccount.service';
import { AccountsModule } from '../Accounts/Accounts.module';
import { CreateCashVaultEntryService } from './queries-and-commands/CreateCashVaultEntry.service';
import { BankingTransactionsModule } from '../BankingTransactions/BankingTransactions.module';
import { ManageCashVaultUnlockService } from './queries-and-commands/ManageCashVaultUnlock.service';
import { CashVaultPasswordVerifierService } from './queries-and-commands/CashVaultPasswordVerifier.service';
import { CashVaultChallengeService } from './queries-and-commands/CashVaultChallenge.service';

const models = [
  RegisterTenancyModel(CashVaultUnlock),
  RegisterTenancyModel(CashVaultDesignatedAdmin),
];

@Module({
  imports: [...models, AuditLogsModule, AccountsModule, BankingTransactionsModule],
  providers: [
    CashVaultApplicationService,
    CashVaultAccessService,
    CashVaultAuditService,
    ManageCashVaultAccountService,
    CreateCashVaultEntryService,
    ManageCashVaultUnlockService,
    CashVaultPasswordVerifierService,
    CashVaultChallengeService,
  ],
  controllers: [CashVaultController],
  exports: [CashVaultAccessService, CashVaultAuditService, ...models],
})
export class CashVaultModule {}
