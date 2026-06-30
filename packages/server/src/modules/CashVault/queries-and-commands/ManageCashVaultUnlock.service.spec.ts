import { ManageCashVaultUnlockService } from './ManageCashVaultUnlock.service';

describe('ManageCashVaultUnlockService', () => {
  it('rejects more than two designated admins', async () => {
    const service = new ManageCashVaultUnlockService({} as any, {} as any);

    await expect(
      service.replaceDesignatedAdmins({
        userIds: [1, 2, 3],
        designatedByUserId: 9,
      }),
    ).rejects.toThrow('cash_vault_designated_admin_limit_exceeded');
  });

  it('replaces designated admins with unique users', async () => {
    const deleted = jest.fn().mockResolvedValue(2);
    const insert = jest.fn().mockResolvedValue([{ userId: 1 }, { userId: 2 }]);
    const designatedAdminModel = () => ({
      query: () => ({
        delete: () => deleted(),
        insert,
      }),
    });
    const service = new ManageCashVaultUnlockService(
      designatedAdminModel as any,
      {} as any,
    );

    await expect(
      service.replaceDesignatedAdmins({
        userIds: [1, 1, 2],
        designatedByUserId: 9,
      }),
    ).resolves.toEqual([{ userId: 1 }, { userId: 2 }]);
    expect(insert).toHaveBeenCalledWith([
      { userId: 1, designatedByUserId: 9 },
      { userId: 2, designatedByUserId: 9 },
    ]);
  });

  it('rejects unlock grants for non-designated users', async () => {
    const designatedAdminModel = () => ({
      query: () => ({
        findOne: jest.fn().mockResolvedValue(null),
      }),
    });
    const service = new ManageCashVaultUnlockService(
      designatedAdminModel as any,
      {} as any,
    );

    await expect(
      service.grantUnlock({
        userId: 4,
        grantedByUserId: 9,
        expiresAt: '2026-06-27T12:00:00.000Z',
      }),
    ).rejects.toThrow('cash_vault_unlock_user_not_designated');
  });

  it('grants and revokes unlocks', async () => {
    const insert = jest.fn().mockResolvedValue({ id: 7, userId: 4 });
    const patchAndFetchById = jest.fn().mockResolvedValue({
      id: 7,
      revokedByUserId: 9,
    });
    const designatedAdminModel = () => ({
      query: () => ({
        findOne: jest.fn().mockResolvedValue({ userId: 4 }),
      }),
    });
    const unlockModel = () => ({
      query: () => ({
        insert,
        patchAndFetchById,
      }),
    });
    const service = new ManageCashVaultUnlockService(
      designatedAdminModel as any,
      unlockModel as any,
    );

    await expect(
      service.grantUnlock({
        userId: 4,
        grantedByUserId: 9,
        expiresAt: '2026-06-27T12:00:00.000Z',
      }),
    ).resolves.toEqual({ id: 7, userId: 4 });
    await expect(service.revokeUnlock(7, 9)).resolves.toEqual({
      id: 7,
      revokedByUserId: 9,
    });
    expect(insert).toHaveBeenCalledWith({
      userId: 4,
      grantedByUserId: 9,
      purpose: 'manage',
      expiresAt: '2026-06-27 12:00:00',
      revokedAt: null,
      revokedByUserId: null,
    });
    expect(patchAndFetchById).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ revokedByUserId: 9 }),
    );
  });
});
