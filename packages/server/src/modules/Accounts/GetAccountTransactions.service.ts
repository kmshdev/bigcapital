import {
  IAccountsTransactionsFilter,
  IGetAccountTransactionPOJO,
} from './Accounts.types';
import { AccountTransactionTransformer } from './AccountTransaction.transformer';
import { AccountTransaction } from './models/AccountTransaction.model';
import { Account } from './models/Account.model';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TransformerInjectable } from '../Transformer/TransformerInjectable.service';
import { TenantModelProxy } from '../System/models/TenantBaseModel';
import { GetAccountTransactionResponseDto } from './dtos/GetAccountTransactionResponse.dto';
import { CashVaultAccessService } from '../CashVault/CashVaultAccess.service';

@Injectable()
export class GetAccountTransactionsService {
  constructor(
    private readonly transformer: TransformerInjectable,

    @Inject(AccountTransaction.name)
    private readonly accountTransaction: TenantModelProxy<
      typeof AccountTransaction
    >,

    @Inject(Account.name)
    private readonly account: TenantModelProxy<typeof Account>,

    @Optional()
    private readonly cashVaultAccess?: CashVaultAccessService,
  ) {}

  /**
   * Retrieve the accounts transactions.
   * @param {IAccountsTransactionsFilter} filter -
   */
  public getAccountsTransactions = async (
    filter: IAccountsTransactionsFilter,
  ): Promise<Array<GetAccountTransactionResponseDto>> => {
    // Retrieve the given account or throw not found error.
    let account: any;
    if (filter.accountId) {
      account = await this.account()
        .query()
        .findById(filter.accountId)
        .throwIfNotFound();
      await this.guardCashVaultAccount(
        account,
        (filter as any).cashVaultAccess,
      );
    }
    const transactions = await this.accountTransaction()
      .query()
      .onBuild((query) => {
        query.orderBy('date', 'DESC');

        if (filter.accountId) {
          query.where('account_id', filter.accountId);
        }
        query.withGraphFetched('account');
        query.withGraphFetched('contact');
        query.limit(filter.limit || 50);
      });
    // Transform the account transaction.
    return this.transformer.transform(
      transactions,
      new AccountTransactionTransformer(),
    );
  };

  private async guardCashVaultAccount(account: any, cashVaultAccess?: any) {
    if (!account?.isCashVault && !account?.is_cash_vault) {
      return;
    }
    const accessContext =
      cashVaultAccess || (await this.cashVaultAccess?.getCurrentUserAccess());
    if (!accessContext || !this.cashVaultAccess) {
      throw new Error('cash_vault_view_permission_required');
    }
    const decision = this.cashVaultAccess.canViewCashVault(accessContext);
    if (!decision.allowed) {
      throw new Error((decision as any).reason);
    }
  }
}
