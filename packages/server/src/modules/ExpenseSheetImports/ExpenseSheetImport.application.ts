import { Injectable } from '@nestjs/common';
import { mapExpenseSheetHeaders } from './ExpenseSheetSchema';
import { ExpenseSheetImportCommitService } from './ExpenseSheetImportCommit.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
} from '@/modules/Bookeepz/DefaultExpenseAccount';

@Injectable()
export class ExpenseSheetImportApplication {
  constructor(
    private readonly commitService: ExpenseSheetImportCommitService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  public upload(body: { sourceFilename: string; uploadedByUserId?: number }) {
    return this.commitService.upload(body.sourceFilename, body.uploadedByUserId);
  }

  public mapping(_importId: number, body: { headers: string[] }) {
    return mapExpenseSheetHeaders(body.headers || []);
  }

  public async preview(_importId: number, body: { rows: Record<string, unknown>[] }) {
    const tenant = await this.tenancyContext.getTenant(true);
    const business = {
      name: tenant.metadata.name,
      organizationId: tenant.organizationId,
    };
    return {
      rows: this.commitService.previewRows(body.rows || [], {
        defaultExpenseAccountName: getDefaultExpenseAccountName(business),
        defaultExpenseAccountSlug: getDefaultExpenseAccountSlug(business),
      }),
    };
  }

  public commit(importId: number, body: { rows: any[] }) {
    return this.commitService.commitRows(Number(importId), body.rows || []);
  }
}
