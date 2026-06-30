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
    jest.useFakeTimers().setSystemTime(new Date('2026-06-27T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an entry unlock after accountant password verification', async () => {
    passwordVerifier.verify.mockResolvedValue(true);
    unlocks.grantUnlock.mockResolvedValue({ id: 99 });
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
    expect(unlocks.grantUnlock).toHaveBeenCalledWith({
      userId: 31,
      grantedByUserId: 31,
      expiresAt: '2026-06-27T10:15:00.000Z',
      purpose: 'entry',
      requireDesignatedAdmin: false,
    });
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

  it('creates a manage unlock for a designated admin management challenge', async () => {
    passwordVerifier.verify.mockResolvedValue(true);
    designatedAdmins.isDesignatedAdmin.mockResolvedValue(true);
    unlocks.grantUnlock.mockResolvedValue({ id: 100 });
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
    ).resolves.toEqual({ purpose: 'manage', granted: true });
    expect(unlocks.grantUnlock).toHaveBeenCalledWith({
      userId: 44,
      grantedByUserId: 44,
      expiresAt: '2026-06-27T10:15:00.000Z',
      purpose: 'manage',
      requireDesignatedAdmin: true,
    });
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
