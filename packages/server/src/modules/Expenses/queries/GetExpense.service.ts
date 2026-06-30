import { Inject, Injectable, Optional } from '@nestjs/common';
import { ExpenseTransfromer } from './Expense.transformer';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { Expense } from '../models/Expense.model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CashVaultAccessService } from '@/modules/CashVault/CashVaultAccess.service';

@Injectable()
export class GetExpenseService {
  constructor(
    private readonly transformerService: TransformerInjectable,

    @Inject(Expense.name)
    private readonly expenseModel: TenantModelProxy<typeof Expense>,

    @Optional()
    private readonly cashVaultAccess?: CashVaultAccessService,
  ) {}

  /**
   * Retrieve expense details.
   * @param {number} expenseId
   * @return {Promise<IExpense>}
   */
  public async getExpense(
    expenseId: number,
    options: { cashVaultAccess?: any } = {},
  ): Promise<Expense> {
    const expense = await this.expenseModel()
      .query()
      .findById(expenseId)
      .withGraphFetched('categories.expenseAccount')
      .withGraphFetched('paymentAccount')
      .withGraphFetched('branch')
      .withGraphFetched('attachments')
      .throwIfNotFound();

    await this.guardCashVaultExpense(expense, options.cashVaultAccess);

    return this.transformerService.transform(expense, new ExpenseTransfromer());
  }

  private async guardCashVaultExpense(expense: Expense, accessContext?: any) {
    const paymentAccount = (expense as any)?.paymentAccount;
    if (!paymentAccount?.isCashVault && !paymentAccount?.is_cash_vault) {
      return;
    }
    const access =
      accessContext || (await this.cashVaultAccess?.getCurrentUserAccess());
    if (!access || !this.cashVaultAccess) {
      throw new Error('cash_vault_view_permission_required');
    }
    const decision = this.cashVaultAccess.canViewCashVault(access);
    if (!decision.allowed) {
      throw new Error((decision as any).reason);
    }
  }
}
