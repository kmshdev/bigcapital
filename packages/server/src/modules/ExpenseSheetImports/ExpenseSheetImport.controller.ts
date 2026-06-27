import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpenseSheetImportApplication } from './ExpenseSheetImport.application';
import { uploadImportFileMulterOptions } from '../Import/ImportMulter.utils';

@ApiTags('Expense Sheet Imports')
@ApiCommonHeaders()
@Controller('expense-sheet-imports')
export class ExpenseSheetImportController {
  constructor(private readonly application: ExpenseSheetImportApplication) {}

  @Post()
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
  @ApiOperation({ summary: 'Map expense-sheet headers.' })
  public mapping(
    @Param('importId') importId: number,
    @Body() body: { headers: string[] },
  ) {
    return this.application.mapping(importId, body);
  }

  @Post(':importId/preview')
  @ApiOperation({ summary: 'Preview expense-sheet rows.' })
  public preview(
    @Param('importId') importId: number,
    @Body() body: { rows: Record<string, unknown>[] },
  ) {
    return this.application.preview(importId, body);
  }

  @Post(':importId/commit')
  @ApiOperation({ summary: 'Commit valid expense-sheet rows.' })
  public commit(
    @Param('importId') importId: number,
    @Body() body: { rows: any[] },
  ) {
    return this.application.commit(importId, body);
  }
}
