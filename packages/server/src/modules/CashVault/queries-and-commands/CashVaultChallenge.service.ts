import { Injectable } from '@nestjs/common';
import { CashVaultPasswordVerifierService } from './CashVaultPasswordVerifier.service';
import { ManageCashVaultUnlockService } from './ManageCashVaultUnlock.service';

export type CashVaultChallengePurpose = 'entry' | 'manage';

export type CashVaultChallengeRequest = {
  userId: number;
  password: string;
  purpose: CashVaultChallengePurpose;
};

@Injectable()
export class CashVaultChallengeService {
  constructor(
    private readonly passwordVerifier: CashVaultPasswordVerifierService,
    private readonly designatedAdmins: ManageCashVaultUnlockService,
    private readonly unlocks: ManageCashVaultUnlockService,
  ) {}

  public async verifyChallenge({
    userId,
    password,
    purpose,
  }: CashVaultChallengeRequest) {
    const isValid = await this.passwordVerifier.verify(userId, password);
    if (!isValid) {
      throw new Error('cash_vault_challenge_invalid');
    }

    if (purpose === 'entry') {
      return { purpose, granted: true };
    }

    const isDesignatedAdmin =
      await this.designatedAdmins.isDesignatedAdmin(userId);
    if (!isDesignatedAdmin) {
      throw new Error('cash_vault_unlock_user_not_designated');
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const unlock = await this.unlocks.grantUnlock({
      userId,
      grantedByUserId: userId,
      expiresAt,
    });

    return { purpose, granted: true, unlockId: unlock.id };
  }
}
