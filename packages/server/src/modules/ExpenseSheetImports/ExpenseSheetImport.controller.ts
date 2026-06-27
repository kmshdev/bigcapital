import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ExpenseSheetImportApplication } from './ExpenseSheetImport.application';

@ApiTags('Expense Sheet Imports')
@ApiCommonHeaders()
@Controller('expense-sheet-imports')
export class ExpenseSheetImportController {
  constructor(private readonly application: ExpenseSheetImportApplication) {}

  @Post()
  @ApiOperation({ summary: 'Create an INR expense-sheet import.' })
  public upload(@Body() body: { sourceFilename: string; uploadedByUserId?: number }) {
    return this.application.upload(body);
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
  public commit(@Param('importId') importId: number, @Body() body: { rows: any[] }) {
    return this.application.commit(importId, body);
  }
}
