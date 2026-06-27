import { Module } from '@nestjs/common';
import { RegisterTenancyModel } from '../Tenancy/TenancyModels/Tenancy.module';
import { ImportModule } from '../Import/Import.module';
import { ExpenseSheetImport } from './models/ExpenseSheetImport.model';
import { ExpenseSheetRow } from './models/ExpenseSheetRow.model';
import { ExpenseSheetImportCommitService } from './ExpenseSheetImportCommit.service';
import { ExpenseSheetImportApplication } from './ExpenseSheetImport.application';
import { ExpenseSheetImportController } from './ExpenseSheetImport.controller';
import { ExpenseSheetImportResource } from './ExpenseSheetImportResource';

const models = [
  RegisterTenancyModel(ExpenseSheetImport),
  RegisterTenancyModel(ExpenseSheetRow),
];

@Module({
  imports: [...models, ImportModule],
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
