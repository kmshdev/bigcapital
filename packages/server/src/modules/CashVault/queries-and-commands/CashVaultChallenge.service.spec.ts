import { CashVaultChallengeService } from './CashVaultChallenge.service';

describe('CashVaultChallengeService', () => {
  const passwordVerifier = {
    verify: jest.fn(),
  };
  const designatedAdmins = {
    isDesignatedAdmin: jest.fn(),
  };
  const unlocks = {
    grantUnlock: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows accountant entry challenge after password verification only', async () => {
    passwordVerifier.verify.mockResolvedValue(true);
    const service = new CashVaultChallengeService(
      passwordVerifier as any,
      designatedAdmins as any,
      unlocks as any,
    );

    await expect(
      service.verifyChallenge({
        userId: 31,
        password: 'cash-password',
        purpose: 'entry',
      }),
    ).resolves.toEqual({ purpose: 'entry', granted: true });
    expect(designatedAdmins.isDesignatedAdmin).not.toHaveBeenCalled();
    expect(unlocks.grantUnlock).not.toHaveBeenCalled();
  });

  it('rejects challenge when cash-vault password is invalid', async () => {
    passwordVerifier.verify.mockResolvedValue(false);
    const service = new CashVaultChallengeService(
      passwordVerifier as any,
      designatedAdmins as any,
      unlocks as any,
    );

    await expect(
      service.verifyChallenge({
        userId: 31,
        password: 'wrong-password',
        purpose: 'entry',
      }),
    ).rejects.toThrow('cash_vault_challenge_invalid');
  });

  it('grants a temporary unlock for a designated owner admin management challenge', async () => {
    passwordVerifier.verify.mockResolvedValue(true);
    designatedAdmins.isDesignatedAdmin.mockResolvedValue(true);
    unlocks.grantUnlock.mockResolvedValue({ id: 9 });
    const service = new CashVaultChallengeService(
      passwordVerifier as any,
      designatedAdmins as any,
      unlocks as any,
    );

    await expect(
      service.verifyChallenge({
        userId: 44,
        password: 'cash-password',
        purpose: 'manage',
      }),
    ).resolves.toEqual({ purpose: 'manage', granted: true, unlockId: 9 });
    expect(unlocks.grantUnlock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 44,
        grantedByUserId: 44,
      }),
    );
  });

  it('rejects management challenge for non-designated users', async () => {
    passwordVerifier.verify.mockResolvedValue(true);
    designatedAdmins.isDesignatedAdmin.mockResolvedValue(false);
    const service = new CashVaultChallengeService(
      passwordVerifier as any,
      designatedAdmins as any,
      unlocks as any,
    );

    await expect(
      service.verifyChallenge({
        userId: 45,
        password: 'cash-password',
        purpose: 'manage',
      }),
    ).rejects.toThrow('cash_vault_unlock_user_not_designated');
  });
});
