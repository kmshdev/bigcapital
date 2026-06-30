import { Injectable } from '@nestjs/common';
import { mapExpenseSheetHeaders } from './ExpenseSheetSchema';
import { ExpenseSheetImportCommitService } from './ExpenseSheetImportCommit.service';
import { TenancyContext } from '@/modules/Tenancy/TenancyContext.service';
import {
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
} from '@/modules/Bookeepz/DefaultExpenseAccount';
import { parseSheetData } from '@/modules/Import/sheet_utils';
import { deleteImportFile, readImportFile } from '@/modules/Import/_utils';
import { validateImportFileMagicBytes } from '@/modules/Import/ImportMulter.utils';

@Injectable()
export class ExpenseSheetImportApplication {
  constructor(
    private readonly commitService: ExpenseSheetImportCommitService,
    private readonly tenancyContext: TenancyContext,
  ) {}

  public upload(body: {
    sourceFilename?: string;
    uploadedByUserId?: number | string;
  }) {
    return this.commitService.upload(
      body.sourceFilename || 'expense-sheet.xlsx',
      this.normalizeUploadedByUserId(body.uploadedByUserId),
    );
  }

  public async uploadFromFile(
    file: Express.Multer.File,
    body: { uploadedByUserId?: number | string } = {},
  ) {
    try {
      const buffer = file.buffer || (await readImportFile(file.filename));
      await validateImportFileMagicBytes(buffer);
      const [rows, headers] = parseSheetData(buffer);
      const importFile = await this.upload({
        sourceFilename: file.originalname,
        uploadedByUserId: body.uploadedByUserId,
      });

      return {
        importId: importFile.id,
        id: importFile.id,
        sourceFilename: importFile.sourceFilename,
        headers,
        mapping: mapExpenseSheetHeaders(headers || []),
        rows,
      };
    } finally {
      if (!file.buffer && file.filename) {
        await deleteImportFile(file.filename);
      }
    }
  }

  public mapping(_importId: number, body: { headers: string[] }) {
    return mapExpenseSheetHeaders(body.headers || []);
  }

  public async preview(
    _importId: number,
    body: { rows: Record<string, unknown>[] },
  ) {
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

  private normalizeUploadedByUserId(uploadedByUserId?: number | string) {
    if (uploadedByUserId === undefined || uploadedByUserId === null) {
      return undefined;
    }
    const normalized = Number(uploadedByUserId);
    return Number.isInteger(normalized) ? normalized : undefined;
  }
}
