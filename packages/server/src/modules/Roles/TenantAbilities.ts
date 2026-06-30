import { Ability } from '@casl/ability';
import * as LruCache from 'lru-cache';
import { Role } from './models/Role.model';
import { RolePermission } from './models/RolePermission.model';
import { AbilitySubject, CashVaultAction } from './Roles.types';
import { UserTenantRole } from '../System/models/UserTenant.model';

// store abilities of 1000 most active users
export const ABILITIES_CACHE = new LruCache(1000);

/**
 * Retrieve ability for the given role.
 * @param {} role
 * @returns
 */
export function getAbilityForRole(
  role,
  membershipRole?: UserTenantRole,
  activeCashVaultUnlockPurpose?: 'entry' | 'manage',
) {
  const rules = getAbilitiesRolesConds(role);
  rules.push(...getCashVaultMembershipRules(membershipRole));
  if (activeCashVaultUnlockPurpose === 'entry') {
    rules.push({
      action: CashVaultAction.Entry,
      subject: AbilitySubject.CashVault,
    });
  }
  if (activeCashVaultUnlockPurpose === 'manage') {
    rules.push(...getCashVaultFullAccessRules());
  }
  return new Ability(rules);
}

/**
 * Retrieve abilities of the given role.
 * @param {IRole} role
 * @returns {}
 */
function getAbilitiesRolesConds(role: Role) {
  switch (role.slug) {
    case 'admin': // predefined role.
      return getSuperAdminRules();
    default:
      return getRulesFromRolePermissions(role.permissions || []);
  }
}

/**
 * Retrieve the super admin rules.
 * @returns {}
 */
function getSuperAdminRules() {
  return [
    { action: 'manage', subject: 'all' },
    { action: 'manage', subject: AbilitySubject.CashVault, inverted: true },
  ];
}

function getCashVaultMembershipRules(membershipRole?: UserTenantRole) {
  switch (membershipRole) {
    case 'owner':
    case 'member':
      return [];
    default:
      return [];
  }
}

function getCashVaultFullAccessRules() {
  return [
    { action: CashVaultAction.Manage, subject: AbilitySubject.CashVault },
    { action: CashVaultAction.View, subject: AbilitySubject.CashVault },
    { action: CashVaultAction.Entry, subject: AbilitySubject.CashVault },
  ];
}

/**
 * Retrieve CASL rules from role permissions.
 * @param {RolePermission[]} permissions -
 * @returns {}
 */
function getRulesFromRolePermissions(permissions: RolePermission[]) {
  return permissions
    .filter((permission: RolePermission) => permission.value)
    .map((permission: RolePermission) => {
      return {
        action: permission.ability,
        subject: permission.subject,
      };
    });
}
