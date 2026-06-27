import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Command } from 'nest-commander';
import { ConfigService } from '@nestjs/config';
import { BaseCommand } from './BaseCommand';
import { hashPassword } from '@/modules/Auth/Auth.utils';
import {
  getDefaultExpenseAccountName,
  getDefaultExpenseAccountSlug,
} from '@/modules/Bookeepz/DefaultExpenseAccount';

export const BOOTSTRAP_BUSINESSES = [
  {
    name: 'Risingstone infra pvt ltd',
    organizationId: 'risingstone_infra_pvt_ltd',
    baseCurrency: 'INR',
  },
  {
    name: 'Risingstone ventures pvt ltd',
    organizationId: 'risingstone_ventures_pvt_ltd',
    baseCurrency: 'INR',
  },
  {
    name: 'Risingstone projects pvt Ltd',
    organizationId: 'risingstone_projects_pvt_ltd',
    baseCurrency: 'INR',
  },
  {
    name: 'Mahetel pvt ltd',
    organizationId: 'mahetel_pvt_ltd',
    baseCurrency: 'INR',
  },
];

export const BOOTSTRAP_USERS = [
  {
    email: 'adminF0@bookeepz.net',
    firstName: 'Admin',
    lastName: 'F0',
    membershipRole: 'owner',
  },
  {
    email: 'adminF1@bookeepz.net',
    firstName: 'Admin',
    lastName: 'F1',
    membershipRole: 'owner',
  },
  {
    email: 'acca0@bookeepz.net',
    firstName: 'Accountant',
    lastName: 'A0',
    membershipRole: 'member',
  },
] as const;

export const USER_PASSWORD_KEYS = [
  'ADMINF0_PASSWORD',
  'ADMINF1_PASSWORD',
  'ACCA0_PASSWORD',
];

export const CASH_VAULT_PASSWORD_KEYS = [
  'ADMINF0_CASH_VAULT_PASSWORD',
  'ADMINF1_CASH_VAULT_PASSWORD',
  'ACCA0_CASH_VAULT_PASSWORD',
];

export { getDefaultExpenseAccountName, getDefaultExpenseAccountSlug };

const emailByPasswordKey = {
  ADMINF0_PASSWORD: 'adminF0@bookeepz.net',
  ADMINF1_PASSWORD: 'adminF1@bookeepz.net',
  ACCA0_PASSWORD: 'acca0@bookeepz.net',
};

const emailByCashVaultPasswordKey = {
  ADMINF0_CASH_VAULT_PASSWORD: 'adminF0@bookeepz.net',
  ADMINF1_CASH_VAULT_PASSWORD: 'adminF1@bookeepz.net',
  ACCA0_CASH_VAULT_PASSWORD: 'acca0@bookeepz.net',
};

export function parseBootstrapSecrets(content: string) {
  const values = Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [key, ...value] = line.split('=');
        return [key, value.join('=')];
      }),
  );

  return {
    loginPasswords: Object.fromEntries(
      Object.entries(emailByPasswordKey).map(([key, email]) => [
        email,
        values[key],
      ]),
    ),
    cashVaultPasswords: Object.fromEntries(
      Object.entries(emailByCashVaultPasswordKey).map(([key, email]) => [
        email,
        values[key],
      ]),
    ),
  };
}

function generatePassword() {
  return crypto.randomBytes(18).toString('base64url');
}

function ensureUserEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  const lines = [
    '# Local Bookeepz bootstrap credentials. Do not commit.',
    ...USER_PASSWORD_KEYS.map((key) => `${key}=${generatePassword()}`),
    ...CASH_VAULT_PASSWORD_KEYS.map((key) => `${key}=${generatePassword()}`),
    '',
  ];
  const content = lines.join('\n');
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  return content;
}

@Command({
  name: 'local:bookeepz:bootstrap',
  description: 'Bootstrap local Bookeepz companies, users, and Cash Vault data',
})
export class LocalBookeepzBootstrapCommand extends BaseCommand {
  constructor(configService: ConfigService) {
    super(configService);
  }

  async run(): Promise<void> {
    const userEnvPath = path.resolve(process.cwd(), '../../.user.env');
    const secrets = parseBootstrapSecrets(ensureUserEnvFile(userEnvPath));
    const systemKnex = this.initSystemKnex();

    try {
      const usersByEmail = await this.upsertSystemUsers(
        systemKnex,
        secrets.loginPasswords,
      );
      const tenantsByOrgId = await this.upsertTenants(systemKnex);

      for (const business of BOOTSTRAP_BUSINESSES) {
        const tenant = tenantsByOrgId[business.organizationId];
        await this.ensureTenantDatabase(systemKnex, business.organizationId);
        const tenantKnex = this.initTenantKnex(business.organizationId);

        try {
          await tenantKnex.migrate.latest();
          await this.ensureTenantBaseline(tenantKnex);
          await this.ensureDefaultExpenseAccount(tenantKnex, business);
          await this.upsertTenantUsers(tenantKnex, usersByEmail);
          await this.upsertCashVaultData(
            tenantKnex,
            usersByEmail,
            secrets.cashVaultPasswords,
          );
        } finally {
          await tenantKnex.destroy();
        }

        await this.upsertMemberships(systemKnex, tenant.id, usersByEmail);
        await systemKnex('tenants')
          .where({ id: tenant.id })
          .update({
            initializedAt: new Date(),
            seededAt: new Date(),
            builtAt: new Date(),
          });
      }
      this.success(`Bookeepz local bootstrap complete. Credentials: .user.env`);
    } finally {
      await systemKnex.destroy();
    }
  }

  private async upsertSystemUsers(knex, loginPasswords) {
    const usersByEmail = {};

    for (const user of BOOTSTRAP_USERS) {
      const existing = await knex('users').where({ email: user.email }).first();
      const payload = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: await hashPassword(loginPasswords[user.email]),
        active: true,
        verified: true,
        inviteAcceptedAt: new Date(),
      };

      if (existing) {
        await knex('users').where({ id: existing.id }).update(payload);
        usersByEmail[user.email] = { ...existing, ...payload };
      } else {
        const [id] = await knex('users').insert(payload);
        usersByEmail[user.email] = { id, ...payload };
      }
    }
    return usersByEmail;
  }

  private async upsertTenants(knex) {
    const tenantsByOrgId = {};

    for (const business of BOOTSTRAP_BUSINESSES) {
      let tenant = await knex('tenants')
        .where({ organizationId: business.organizationId })
        .first();
      if (!tenant) {
        const [id] = await knex('tenants').insert({
          organizationId: business.organizationId,
          initializedAt: new Date(),
          seededAt: new Date(),
          builtAt: new Date(),
        });
        tenant = await knex('tenants').where({ id }).first();
      }
      const metadata = {
        tenantId: tenant.id,
        name: business.name,
        baseCurrency: business.baseCurrency,
        location: 'IN',
        language: 'en',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        fiscalYear: '1',
      };
      const existingMetadata = await knex('tenants_metadata')
        .where({ tenantId: tenant.id })
        .first();
      if (existingMetadata) {
        await knex('tenants_metadata')
          .where({ tenantId: tenant.id })
          .update(metadata);
      } else {
        await knex('tenants_metadata').insert(metadata);
      }
      tenantsByOrgId[business.organizationId] = tenant;
    }
    return tenantsByOrgId;
  }

  private async upsertMemberships(knex, tenantId, usersByEmail) {
    for (const user of BOOTSTRAP_USERS) {
      const systemUser = usersByEmail[user.email];
      const existing = await knex('user_tenants')
        .where({ userId: systemUser.id, tenantId })
        .first();
      const payload = {
        userId: systemUser.id,
        tenantId,
        role: user.membershipRole,
      };
      if (existing) {
        await knex('user_tenants').where({ id: existing.id }).update(payload);
      } else {
        await knex('user_tenants').insert(payload);
      }
    }
  }

  private async ensureTenantDatabase(knex, organizationId: string) {
    const dbName = `${this.configService.get('tenantDatabase.dbNamePrefix')}${organizationId}`;
    await knex.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  }

  private async upsertTenantUsers(knex, usersByEmail) {
    const adminRole = await knex('roles').where({ slug: 'admin' }).first();
    for (const user of BOOTSTRAP_USERS) {
      const systemUser = usersByEmail[user.email];
      const existing = await knex('users')
        .where({ systemUserId: systemUser.id })
        .first();
      const payload = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        active: true,
        inviteAcceptedAt: new Date(),
        systemUserId: systemUser.id,
        roleId: adminRole.id,
      };
      if (existing) {
        await knex('users').where({ id: existing.id }).update(payload);
      } else {
        await knex('users').insert(payload);
      }
    }
  }

  private async ensureTenantBaseline(knex) {
    const adminRole = await knex('roles').where({ slug: 'admin' }).first();
    if (!adminRole) {
      await knex('roles').insert({
        id: 1,
        name: 'role.admin.name',
        predefined: true,
        slug: 'admin',
        description: 'role.admin.desc',
      });
    }
    const staffRole = await knex('roles').where({ slug: 'staff' }).first();
    if (!staffRole) {
      await knex('roles').insert({
        id: 2,
        name: 'role.staff.name',
        predefined: true,
        slug: 'staff',
        description: 'role.staff.desc',
      });
    }
  }

  private async ensureDefaultExpenseAccount(
    knex,
    business: (typeof BOOTSTRAP_BUSINESSES)[number],
  ) {
    const slug = getDefaultExpenseAccountSlug(business);
    const payload = {
      name: getDefaultExpenseAccountName(business),
      slug,
      accountType: 'expense',
      code: 'EXPMAIN01',
      description: 'Default expense account for normal Bookeepz entries.',
      active: true,
      predefined: false,
      currencyCode: business.baseCurrency,
      seededAt: new Date(),
    };
    const existing = await knex('accounts').where({ slug }).first();
    if (existing) {
      await knex('accounts').where({ id: existing.id }).update(payload);
      return;
    }
    await knex('accounts').insert(payload);
  }

  private async upsertCashVaultData(knex, usersByEmail, cashVaultPasswords) {
    const hasCredentialsTable =
      (await knex.schema.hasTable('cash_vault_credentials')) ||
      (await knex.schema.hasTable('CASH_VAULT_CREDENTIALS'));
    if (!hasCredentialsTable) {
      await knex.schema.createTable('cash_vault_credentials', (table) => {
        table.increments('id');
        table.integer('user_id').unsigned().notNullable().unique();
        table.string('password_hash').notNullable();
        table.timestamps();
      });
    }

    const cashAccount = await this.ensureCashVaultAccount(knex);
    await knex('accounts').where({ id: cashAccount.id }).update({
      isCashVault: true,
      cashVaultEntryEnabled: true,
      cashVaultDesignatedAt: new Date(),
      cashVaultDesignatedByUserId: usersByEmail['adminF0@bookeepz.net'].id,
    });

    await knex('cash_vault_designated_admins').del();
    await knex('cash_vault_designated_admins').insert([
      {
        userId: usersByEmail['adminF0@bookeepz.net'].id,
        designatedByUserId: usersByEmail['adminF0@bookeepz.net'].id,
      },
      {
        userId: usersByEmail['adminF1@bookeepz.net'].id,
        designatedByUserId: usersByEmail['adminF0@bookeepz.net'].id,
      },
    ]);

    for (const user of BOOTSTRAP_USERS) {
      const systemUser = usersByEmail[user.email];
      const payload = {
        userId: systemUser.id,
        passwordHash: await hashPassword(cashVaultPasswords[user.email]),
        updatedAt: new Date(),
      };
      const existing = await knex('cash_vault_credentials')
        .where({ userId: systemUser.id })
        .first();
      if (existing) {
        await knex('cash_vault_credentials')
          .where({ id: existing.id })
          .update(payload);
      } else {
        await knex('cash_vault_credentials').insert({
          ...payload,
          createdAt: new Date(),
        });
      }
    }
  }

  private async ensureCashVaultAccount(knex) {
    const existing = await knex('accounts')
      .where({ slug: 'bookeepz-hidden-cash-vault' })
      .first();
    if (existing) return existing;

    const [id] = await knex('accounts').insert({
      name: 'Hidden Cash Vault',
      slug: 'bookeepz-hidden-cash-vault',
      accountType: 'cash',
      code: 'CASH-VAULT',
      currencyCode: 'INR',
      active: true,
      predefined: false,
    });
    return knex('accounts').where({ id }).first();
  }
}
