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

  it('allows owner memberships to manage, view, and enter Cash Vault data', () => {
    const ability = getAbilityForRole(adminRole, 'owner');

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

  it('allows accountant memberships to create Cash Vault entries only', () => {
    const ability = getAbilityForRole(adminRole, 'member');

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

  it('allows active unlock users to manage, view, and enter Cash Vault data', () => {
    const ability = getAbilityForRole(adminRole, 'member', true);

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
