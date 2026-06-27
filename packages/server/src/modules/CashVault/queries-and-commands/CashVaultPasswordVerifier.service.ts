import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import * as bcrypt from 'bcrypt';
import { TENANCY_DB_CONNECTION } from '@/modules/Tenancy/TenancyDB/TenancyDB.constants';

@Injectable()
export class CashVaultPasswordVerifierService {
  constructor(
    @Inject(TENANCY_DB_CONNECTION)
    private readonly tenantKnex: () => Knex,
  ) {}

  public async verify(userId: number, password: string) {
    const credential = await this.tenantKnex()('cash_vault_credentials')
      .where({ userId })
      .first();

    if (!credential?.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, credential.passwordHash);
  }
}
