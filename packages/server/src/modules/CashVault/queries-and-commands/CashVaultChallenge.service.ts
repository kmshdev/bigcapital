import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
  private readonly unlockDurationMs = 15 * 60 * 1000;

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
      throw new UnauthorizedException('cash_vault_challenge_invalid');
    }

    if (purpose === 'entry') {
      await this.unlocks.grantUnlock({
        userId,
        grantedByUserId: userId,
        expiresAt: this.getChallengeExpiry(),
        purpose,
        requireDesignatedAdmin: false,
      });
      return { purpose, granted: true };
    }

    const isDesignatedAdmin =
      await this.designatedAdmins.isDesignatedAdmin(userId);
    if (!isDesignatedAdmin) {
      throw new ForbiddenException('cash_vault_unlock_user_not_designated');
    }

    await this.unlocks.grantUnlock({
      userId,
      grantedByUserId: userId,
      expiresAt: this.getChallengeExpiry(),
      purpose,
      requireDesignatedAdmin: true,
    });
    return { purpose, granted: true };
  }

  private getChallengeExpiry() {
    return new Date(Date.now() + this.unlockDurationMs).toISOString();
  }
}
