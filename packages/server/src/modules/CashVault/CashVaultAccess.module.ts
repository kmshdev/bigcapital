import { Module } from '@nestjs/common';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { CashVaultAccessService } from './CashVaultAccess.service';
import { CashVaultDesignatedAdmin } from './models/CashVaultDesignatedAdmin.model';
import { CashVaultUnlock } from './models/CashVaultUnlock.model';

const models = [
  RegisterTenancyModel(CashVaultUnlock),
  RegisterTenancyModel(CashVaultDesignatedAdmin),
];

@Module({
  imports: [...models],
  providers: [CashVaultAccessService],
  exports: [CashVaultAccessService, ...models],
})
export class CashVaultAccessModule {}
