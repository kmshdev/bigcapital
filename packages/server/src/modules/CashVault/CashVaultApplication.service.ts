import { Injectable } from '@nestjs/common';
import { DesignateCashVaultAccountDto } from './dtos/CashVaultAccount.dto';
import { CreateCashVaultEntryDto } from './dtos/CashVaultEntry.dto';
import {
  GrantCashVaultUnlockDto,
  ReplaceCashVaultDesignatedAdminsDto,
} from './dtos/CashVaultUnlock.dto';
import { ManageCashVaultAccountService } from './queries-and-commands/ManageCashVaultAccount.service';
import { CreateCashVaultEntryService } from './queries-and-commands/CreateCashVaultEntry.service';
import { ManageCashVaultUnlockService } from './queries-and-commands/ManageCashVaultUnlock.service';
import {
  CashVaultChallengePurpose,
  CashVaultChallengeService,
} from './queries-and-commands/CashVaultChallenge.service';

@Injectable()
export class CashVaultApplicationService {
  constructor(
    private readonly manageCashVaultAccount: ManageCashVaultAccountService,
    private readonly createCashVaultEntryService: CreateCashVaultEntryService,
    private readonly manageCashVaultUnlock: ManageCashVaultUnlockService,
    private readonly cashVaultChallenge: CashVaultChallengeService,
  ) {}

  public getCashVaultAccounts() {
    return this.manageCashVaultAccount.listAccounts();
  }

  public designateCashVaultAccount(body: DesignateCashVaultAccountDto) {
    return this.manageCashVaultAccount.designateAccount(body);
  }

  public removeCashVaultDesignation(accountId: number) {
    return this.manageCashVaultAccount.removeDesignation(accountId);
  }

  public createCashVaultEntry(body: CreateCashVaultEntryDto) {
    return this.createCashVaultEntryService.createEntry(body);
  }

  public getDesignatedAdmins() {
    return this.manageCashVaultUnlock.listDesignatedAdmins();
  }

  public replaceDesignatedAdmins(body: ReplaceCashVaultDesignatedAdminsDto) {
    return this.manageCashVaultUnlock.replaceDesignatedAdmins(body);
  }

  public grantUnlock(body: GrantCashVaultUnlockDto) {
    return this.manageCashVaultUnlock.grantUnlock(body);
  }

  public revokeUnlock(unlockId: number, revokedByUserId: number) {
    return this.manageCashVaultUnlock.revokeUnlock(unlockId, revokedByUserId);
  }

  public verifyChallenge(body: {
    userId: number;
    password: string;
    purpose: CashVaultChallengePurpose;
  }) {
    return this.cashVaultChallenge.verifyChallenge(body);
  }
}
