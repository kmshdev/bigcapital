import * as bcrypt from 'bcrypt';
import {
  BOOTSTRAP_BUSINESSES,
  BOOTSTRAP_USERS,
  parseBootstrapSecrets,
} from './LocalBookeepzBootstrap.command';
import { ReadinessFailure } from './BookeepzReadinessEnv';
import {
  evaluateAccountInvariants,
  evaluateDesignatedAdmins,
  evaluateTenantInvariants,
} from './BookeepzReadinessInvariants';

type AnyKnex = any;

function credentialFailure(
  target: string,
  message: string,
): ReadinessFailure {
  return {
    class: 'credential_mismatch',
    operation: 'credential.bcrypt',
    target,
    message,
  };
}

export async function evaluateCredentialMatches(input: {
  organizationId: string;
  loginPasswords: Record<string, string | undefined>;
  cashVaultPasswords: Record<string, string | undefined>;
  systemUsers: { id: number; email: string; password: string }[];
  cashVaultCredentials: { userId: number; email: string; passwordHash: string }[];
}) {
  const failures: ReadinessFailure[] = [];
  const matches: Record<
    string,
    { loginPassword: boolean; cashVaultPassword: boolean }
  > = {};

  for (const user of BOOTSTRAP_USERS) {
    const systemUser = input.systemUsers.find((row) => row.email === user.email);
    const credential = input.cashVaultCredentials.find(
      (row) => row.email === user.email,
    );
    const loginPassword = input.loginPasswords[user.email];
    const cashVaultPassword = input.cashVaultPasswords[user.email];
    const loginMatch =
      Boolean(systemUser?.password && loginPassword) &&
      (await bcrypt.compare(loginPassword as string, systemUser.password));
    const cashVaultMatch =
      Boolean(credential?.passwordHash && cashVaultPassword) &&
      (await bcrypt.compare(
        cashVaultPassword as string,
        credential.passwordHash,
      ));

    matches[user.email] = {
      loginPassword: loginMatch,
      cashVaultPassword: cashVaultMatch,
    };
    if (!loginMatch) {
      failures.push(
        credentialFailure(
          `${input.organizationId}:${user.email}:login`,
          'Login password from .user.env does not match the stored system user hash.',
        ),
      );
    }
    if (!cashVaultMatch) {
      failures.push(
        credentialFailure(
          `${input.organizationId}:${user.email}:cash-vault`,
          'Cash Vault password from .user.env does not match tenant credential hash.',
        ),
      );
    }
  }

  return { failures, matches };
}

export async function checkBookeepzDatabaseReadiness(input: {
  systemKnex: AnyKnex;
  tenantKnexFactory: (organizationId: string) => AnyKnex;
  userEnvContent: string;
}) {
  const secrets = parseBootstrapSecrets(input.userEnvContent);
  const failures: ReadinessFailure[] = [];
  const companies: Record<string, any> = {};
  const tenants = await input.systemKnex('tenants');
  failures.push(...evaluateTenantInvariants(tenants).failures);

  const systemUsers = await input.systemKnex('users').whereIn(
    'email',
    BOOTSTRAP_USERS.map((user) => user.email),
  );

  for (const business of BOOTSTRAP_BUSINESSES) {
    const tenantKnex = input.tenantKnexFactory(business.organizationId);
    try {
      const accounts = await tenantKnex('accounts');
      const tenantUsers = await tenantKnex('users')
        .select('users.id', 'users.email')
        .whereIn(
          'users.email',
          BOOTSTRAP_USERS.map((user) => user.email),
        );
      const designatedAdmins = await tenantKnex('cash_vault_designated_admins')
        .join('users', 'users.id', 'cash_vault_designated_admins.userId')
        .select('users.email');
      const cashVaultCredentials = await tenantKnex('cash_vault_credentials')
        .join('users', 'users.id', 'cash_vault_credentials.userId')
        .select(
          'cash_vault_credentials.userId',
          'users.email',
          'cash_vault_credentials.passwordHash',
        );

      failures.push(
        ...evaluateAccountInvariants({ business, accounts }).failures,
        ...evaluateDesignatedAdmins({
          organizationId: business.organizationId,
          rows: designatedAdmins,
        }).failures,
      );

      const credentialResult = await evaluateCredentialMatches({
        organizationId: business.organizationId,
        loginPasswords: secrets.loginPasswords,
        cashVaultPasswords: secrets.cashVaultPasswords,
        systemUsers,
        cashVaultCredentials,
      });
      failures.push(...credentialResult.failures);
      companies[business.organizationId] = {
        users: tenantUsers.map((row) => row.email),
        credentialMatches: credentialResult.matches,
      };
    } finally {
      await tenantKnex.destroy?.();
    }
  }

  return { failures, companies };
}
