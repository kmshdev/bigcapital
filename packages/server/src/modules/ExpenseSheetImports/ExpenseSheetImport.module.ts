import { Module } from '@nestjs/common';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { ImportModule } from '../Import/Import.module';
import { ExpenseSheetImport } from './models/ExpenseSheetImport.model';
import { ExpenseSheetRow } from './models/ExpenseSheetRow.model';
import { ExpenseSheetImportCommitService } from './ExpenseSheetImportCommit.service';
import { ExpenseSheetImportApplication } from './ExpenseSheetImport.application';
import { ExpenseSheetImportController } from './ExpenseSheetImport.controller';
import { ExpenseSheetImportResource } from './ExpenseSheetImportResource';
import { Account } from '../Accounts/models/Account.model';
import { ExpensesModule } from '../Expenses/Expenses.module';
import { TenancyModule } from '../Tenancy/Tenancy.module';

const models = [
  RegisterTenancyModel(ExpenseSheetImport),
  RegisterTenancyModel(ExpenseSheetRow),
  RegisterTenancyModel(Account),
];

@Module({
  imports: [...models, ImportModule, ExpensesModule, TenancyModule],
  controllers: [ExpenseSheetImportController],
  providers: [
    ExpenseSheetImportCommitService,
    ExpenseSheetImportApplication,
    {
      provide: 'EXPENSE_SHEET_IMPORT_RESOURCE',
      useValue: ExpenseSheetImportResource,
    },
  ],
  exports: [...models, ExpenseSheetImportCommitService],
})
export class ExpenseSheetImportModule {}
