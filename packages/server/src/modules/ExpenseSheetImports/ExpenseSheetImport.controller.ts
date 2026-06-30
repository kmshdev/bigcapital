import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpenseSheetImportApplication } from './ExpenseSheetImport.application';
import { uploadImportFileMulterOptions } from '../Import/ImportMulter.utils';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ExpenseAction } from '../Expenses/Expenses.types';

@ApiTags('Expense Sheet Imports')
@ApiCommonHeaders()
@Controller('expense-sheet-imports')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class ExpenseSheetImportController {
  constructor(private readonly application: ExpenseSheetImportApplication) {}

  @Post()
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Create an INR expense-sheet import.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        uploadedByUserId: { type: 'number' },
        sourceFilename: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', uploadImportFileMulterOptions))
  public upload(
    @UploadedFile()
    file:
      | Express.Multer.File
      | { sourceFilename?: string; uploadedByUserId?: number },
    @Body() body?: { sourceFilename?: string; uploadedByUserId?: number },
  ) {
    const uploadedFile = file as Express.Multer.File;
    if (uploadedFile?.buffer || uploadedFile?.filename) {
      return this.application.uploadFromFile(uploadedFile, body);
    }
    const uploadBody = body || (file as any);
    return this.application.upload({
      sourceFilename: uploadBody.sourceFilename,
      uploadedByUserId: uploadBody.uploadedByUserId,
    });
  }

  @Post(':importId/mapping')
  @RequirePermission(ExpenseAction.View, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Map expense-sheet headers.' })
  public mapping(
    @Param('importId') importId: number,
    @Body() body: { headers: string[] },
  ) {
    return this.application.mapping(importId, body);
  }

  @Post(':importId/preview')
  @RequirePermission(ExpenseAction.View, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Preview expense-sheet rows.' })
  public preview(
    @Param('importId') importId: number,
    @Body() body: { rows: Record<string, unknown>[] },
  ) {
    return this.application.preview(importId, body);
  }

  @Post(':importId/commit')
  @RequirePermission(ExpenseAction.Create, AbilitySubject.Expense)
  @ApiOperation({ summary: 'Commit valid expense-sheet rows.' })
  public commit(
    @Param('importId') importId: number,
    @Body() body: { rows: any[] },
  ) {
    return this.application.commit(importId, body);
  }
}
