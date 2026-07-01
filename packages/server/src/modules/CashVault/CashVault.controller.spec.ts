import { CashVaultController } from './CashVault.controller';
import { REQUIRED_PERMISSION_KEY } from '@/modules/Roles/RequirePermission.decorator';
import { AbilitySubject, CashVaultAction } from '@/modules/Roles/Roles.types';

describe('CashVaultController', () => {
  it('lists Cash Vault accounts through the application service', async () => {
    const app = {
      getCashVaultAccounts: jest.fn().mockResolvedValue([{ id: 1 }]),
    };
    const controller = new CashVaultController(app as any);

    await expect((controller as any).getCashVaultAccounts()).resolves.toEqual([
      { id: 1 },
    ]);
    expect(app.getCashVaultAccounts).toHaveBeenCalledTimes(1);
  });

  it('requires CashVault.Entry permission for listing the current vault account', () => {
    const metadata = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      CashVaultController.prototype.getCashVaultAccounts,
    );

    expect(metadata).toEqual({
      ability: CashVaultAction.Entry,
      subject: AbilitySubject.CashVault,
    });
  });

  it('designates an account as Cash Vault through the application service', async () => {
    const app = {
      designateCashVaultAccount: jest.fn().mockResolvedValue({
        id: 10,
        isCashVault: true,
      }),
    };
    const controller = new CashVaultController(app as any);
    const body = { accountId: 10, entryEnabled: true };

    await expect(
      (controller as any).designateCashVaultAccount(body),
    ).resolves.toEqual({
      id: 10,
      isCashVault: true,
    });
    expect(app.designateCashVaultAccount).toHaveBeenCalledWith(body);
  });

  it('removes Cash Vault designation through the application service', async () => {
    const app = {
      removeCashVaultDesignation: jest.fn().mockResolvedValue({
        id: 10,
        isCashVault: false,
      }),
    };
    const controller = new CashVaultController(app as any);

    await expect(
      (controller as any).removeCashVaultDesignation(10),
    ).resolves.toEqual({
      id: 10,
      isCashVault: false,
    });
    expect(app.removeCashVaultDesignation).toHaveBeenCalledWith(10);
  });

  it('creates an entry through the application service', async () => {
    const app = {
      createCashVaultEntry: jest.fn().mockResolvedValue({
        transactionId: 55,
        transactionType: 'deposit',
        amount: 1000,
        date: '2026-06-27',
      }),
    };
    const controller = new CashVaultController(app as any);
    const body = {
      transactionType: 'deposit',
      amount: 1000,
      date: '2026-06-27',
      description: 'Cash top up',
      offsetAccountId: 40,
    };

    await expect((controller as any).createCashVaultEntry(body)).resolves.toEqual(
      {
        transactionId: 55,
        transactionType: 'deposit',
        amount: 1000,
        date: '2026-06-27',
      },
    );
    expect(app.createCashVaultEntry).toHaveBeenCalledWith(body);
  });

  it('requires CashVault.Entry permission for entry-only creation', () => {
    const metadata = Reflect.getMetadata(
      REQUIRED_PERMISSION_KEY,
      CashVaultController.prototype.createCashVaultEntry,
    );

    expect(metadata).toEqual({
      ability: CashVaultAction.Entry,
      subject: AbilitySubject.CashVault,
    });
  });

  it('replaces designated admins through the application service', async () => {
    const app = {
      replaceDesignatedAdmins: jest.fn().mockResolvedValue([{ userId: 1 }]),
    };
    const cls = { get: jest.fn().mockReturnValue(9) };
    const controller = new CashVaultController(app as any, cls as any);
    const body = { userIds: [1], designatedByUserId: 999 };

    await expect(
      (controller as any).replaceDesignatedAdmins(body),
    ).resolves.toEqual([{ userId: 1 }]);
    expect(app.replaceDesignatedAdmins).toHaveBeenCalledWith({
      userIds: [1],
      designatedByUserId: 9,
    });
  });

  it('grants and revokes temporary unlocks through the application service', async () => {
    const app = {
      grantUnlock: jest.fn().mockResolvedValue({ id: 7 }),
      revokeUnlock: jest.fn().mockResolvedValue({ id: 7, revokedByUserId: 9 }),
    };
    const cls = { get: jest.fn().mockReturnValue(9) };
    const controller = new CashVaultController(app as any, cls as any);
    const body = {
      userId: 4,
      grantedByUserId: 999,
      purpose: 'manage',
      expiresAt: '2026-06-27T12:00:00.000Z',
    };

    await expect((controller as any).grantUnlock(body)).resolves.toEqual({
      id: 7,
    });
    await expect((controller as any).revokeUnlock(7, 9)).resolves.toEqual({
      id: 7,
      revokedByUserId: 9,
    });
    expect(app.grantUnlock).toHaveBeenCalledWith({
      userId: 4,
      grantedByUserId: 9,
      purpose: 'manage',
      expiresAt: '2026-06-27T12:00:00.000Z',
    });
    expect(app.revokeUnlock).toHaveBeenCalledWith(7, 9);
  });
});
