import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCommonHeaders } from '@/common/decorators/ApiCommonHeaders';
import { ApiBody, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CashVaultApplicationService } from './CashVaultApplication.service';
import { DesignateCashVaultAccountDto } from './dtos/CashVaultAccount.dto';
import { CreateCashVaultEntryDto } from './dtos/CashVaultEntry.dto';
import {
  GrantCashVaultUnlockDto,
  ReplaceCashVaultDesignatedAdminsDto,
  RevokeCashVaultUnlockDto,
} from './dtos/CashVaultUnlock.dto';
import { RequirePermission } from '@/modules/Roles/RequirePermission.decorator';
import { PermissionGuard } from '@/modules/Roles/Permission.guard';
import { AuthorizationGuard } from '@/modules/Roles/Authorization.guard';
import { AbilitySubject, CashVaultAction } from '@/modules/Roles/Roles.types';
import { ClsService } from 'nestjs-cls';

@ApiTags('Cash Vault')
@ApiCommonHeaders()
@Controller('cash-vault')
@UseGuards(AuthorizationGuard, PermissionGuard)
export class CashVaultController {
  constructor(
    private readonly cashVaultApplication: CashVaultApplicationService,
    private readonly cls?: ClsService,
  ) {}

  @Post('/challenge')
  @ApiOperation({ summary: 'Verify Cash Vault password challenge.' })
  public verifyChallenge(
    @Body() body: { password: string; purpose: 'entry' | 'manage' },
  ) {
    return this.cashVaultApplication.verifyChallenge({
      userId: this.cls?.get('userId'),
      password: body.password,
      purpose: body.purpose,
    });
  }

  @Get('/accounts')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'List Cash Vault accounts visible to the user.' })
  public getCashVaultAccounts() {
    return this.cashVaultApplication.getCashVaultAccounts();
  }

  @Post('/accounts')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'Designate a cash account as Cash Vault.' })
  @ApiBody({ type: DesignateCashVaultAccountDto })
  public designateCashVaultAccount(@Body() body: DesignateCashVaultAccountDto) {
    return this.cashVaultApplication.designateCashVaultAccount(body);
  }

  @Delete('/accounts/:accountId')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'Remove Cash Vault designation from an account.' })
  @ApiParam({ name: 'accountId', type: Number })
  public removeCashVaultDesignation(@Param('accountId') accountId: number) {
    return this.cashVaultApplication.removeCashVaultDesignation(accountId);
  }

  @Post('/entries')
  @RequirePermission(CashVaultAction.Entry, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'Create a Help-menu Cash Vault entry.' })
  @ApiBody({ type: CreateCashVaultEntryDto })
  public createCashVaultEntry(@Body() body: CreateCashVaultEntryDto) {
    return this.cashVaultApplication.createCashVaultEntry(body);
  }

  @Get('/designated-admins')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'List Cash Vault designated admins.' })
  public getDesignatedAdmins() {
    return this.cashVaultApplication.getDesignatedAdmins();
  }

  @Post('/designated-admins')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'Replace Cash Vault designated admins.' })
  @ApiBody({ type: ReplaceCashVaultDesignatedAdminsDto })
  public replaceDesignatedAdmins(
    @Body() body: ReplaceCashVaultDesignatedAdminsDto,
  ) {
    return this.cashVaultApplication.replaceDesignatedAdmins(body);
  }

  @Post('/unlocks')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'Grant a temporary Cash Vault unlock.' })
  @ApiBody({ type: GrantCashVaultUnlockDto })
  public grantUnlock(@Body() body: GrantCashVaultUnlockDto) {
    return this.cashVaultApplication.grantUnlock(body);
  }

  @Delete('/unlocks/:unlockId')
  @RequirePermission(CashVaultAction.Manage, AbilitySubject.CashVault)
  @ApiOperation({ summary: 'Revoke a temporary Cash Vault unlock.' })
  @ApiBody({ type: RevokeCashVaultUnlockDto })
  public revokeUnlock(
    @Param('unlockId') unlockId: number,
    @Body('revokedByUserId') revokedByUserId: number,
  ) {
    return this.cashVaultApplication.revokeUnlock(unlockId, revokedByUserId);
  }
}
