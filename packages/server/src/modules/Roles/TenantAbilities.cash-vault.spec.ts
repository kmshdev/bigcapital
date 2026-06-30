import { AbilitySubject, CashVaultAction } from './Roles.types';
import { getAbilityForRole } from './TenantAbilities';

const adminRole = {
  slug: 'admin',
  permissions: [],
} as any;

describe('getAbilityForRole Cash Vault rules', () => {
  it('does not let tenant-local admin imply Cash Vault access', () => {
    const ability = getAbilityForRole(adminRole);

    expect(ability.can('manage', 'all')).toBe(true);
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      false,
    );
  });

  it('does not let owner memberships bypass the Cash Vault challenge', () => {
    const ability = getAbilityForRole(adminRole, 'owner');

    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      false,
    );
  });

  it('does not let accountant memberships bypass the Cash Vault challenge', () => {
    const ability = getAbilityForRole(adminRole, 'member');

    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      false,
    );
  });

  it('allows entry unlock users to create Cash Vault entries only', () => {
    const ability = getAbilityForRole(adminRole, 'member', 'entry');

    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      true,
    );
    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      false,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      false,
    );
  });

  it('allows manage unlock users to manage, view, and enter Cash Vault data', () => {
    const ability = getAbilityForRole(adminRole, 'member', 'manage');

    expect(ability.can(CashVaultAction.Manage, AbilitySubject.CashVault)).toBe(
      true,
    );
    expect(ability.can(CashVaultAction.View, AbilitySubject.CashVault)).toBe(
      true,
    );
    expect(ability.can(CashVaultAction.Entry, AbilitySubject.CashVault)).toBe(
      true,
    );
  });
});
