import 'reflect-metadata';

import { GUARDS_METADATA } from '@nestjs/common/constants';
import {
  REQUIRED_PERMISSION_KEY,
  RequiredPermission,
} from '@/modules/Roles/RequirePermission.decorator';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AbilitySubject } from '@/modules/Roles/Roles.types';
import { ExpenseAction } from '@/modules/Expenses/Expenses.types';
import { ExpenseSheetImportController } from './ExpenseSheetImport.controller';

describe('ExpenseSheetImportController', () => {
  const getRequiredPermission = (
    methodName: keyof ExpenseSheetImportController,
  ): RequiredPermission =>
    Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      ExpenseSheetImportController.prototype[methodName],
    );

  it('applies authorization and permission guards to the controller', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ExpenseSheetImportController),
    ).toEqual([AuthorizationGuard, PermissionGuard]);
  });

  it('exposes upload, mapping, preview, and commit methods through the service', async () => {
    const app = {
      upload: jest.fn().mockResolvedValue({ importId: 1 }),
      mapping: jest.fn().mockResolvedValue({ mapping: {} }),
      preview: jest.fn().mockResolvedValue({ rows: [] }),
      commit: jest.fn().mockResolvedValue({ committed: 1, rejected: 0 }),
    };
    const controller = new ExpenseSheetImportController(app as any);

    await expect(
      controller.upload({ sourceFilename: 'x.xlsx' }),
    ).resolves.toEqual({
      importId: 1,
    });
    await expect(
      controller.mapping(1, { headers: ['Bill No'] }),
    ).resolves.toEqual({
      mapping: {},
    });
    await expect(controller.preview(1, { rows: [] })).resolves.toEqual({
      rows: [],
    });
    await expect(controller.commit(1, { rows: [] })).resolves.toEqual({
      committed: 1,
      rejected: 0,
    });
  });

  it('passes uploaded workbook files to the import application', async () => {
    const file = {
      originalname: 'expenses.xlsx',
      buffer: Buffer.from('workbook-bytes'),
    } as Express.Multer.File;
    const app = {
      uploadFromFile: jest.fn().mockResolvedValue({ importId: 7, rows: [] }),
    };
    const controller = new ExpenseSheetImportController(app as any);

    await expect(
      (controller.upload as any)(file, { uploadedByUserId: 12 }),
    ).resolves.toEqual({ importId: 7, rows: [] });
    expect(app.uploadFromFile).toHaveBeenCalledWith(file, {
      uploadedByUserId: 12,
    });
  });

  it('requires expense permissions on import workflow routes', () => {
    expect(getRequiredPermission('upload')).toEqual({
      ability: ExpenseAction.Create,
      subject: AbilitySubject.Expense,
    });
    expect(getRequiredPermission('commit')).toEqual({
      ability: ExpenseAction.Create,
      subject: AbilitySubject.Expense,
    });
    expect(getRequiredPermission('mapping')).toEqual({
      ability: ExpenseAction.View,
      subject: AbilitySubject.Expense,
    });
    expect(getRequiredPermission('preview')).toEqual({
      ability: ExpenseAction.View,
      subject: AbilitySubject.Expense,
    });
  });
});
