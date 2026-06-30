import { Injectable } from '@nestjs/common';
import { AccountRepository } from '@/modules/Accounts/repositories/Account.repository';
import { GetExpensesService } from '@/modules/Expenses/queries/GetExpenses.service';
import { CreateExpense } from '@/modules/Expenses/commands/CreateExpense.service';
import { CreateCashVaultExpenseDto } from '../dtos/CashVaultExpense.dto';

@Injectable()
export class CashVaultExpenseService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly getExpensesService: GetExpensesService,
    private readonly createExpenseService: CreateExpense,
  ) {}

  public async listExpenses() {
    const entryTarget = await this.getEntryTarget();

    return this.getExpensesService.getExpensesList({
      page: 1,
      pageSize: 50,
      includeCashVaultExpenses: true,
      filterQuery: (builder) => {
        builder.where('payment_account_id', entryTarget.id);
      },
    } as any);
  }

  public async createExpense(body: CreateCashVaultExpenseDto) {
    const entryTarget = await this.getEntryTarget();

    return this.createExpenseService.newExpense({
      ...body,
      paymentAccountId: entryTarget.id,
      currencyCode: 'INR',
      exchangeRate: 1,
      publish: true,
      categories: body.categories.map((category, index) => ({
        ...category,
        index: index + 1,
      })),
    } as any);
  }

  private async getEntryTarget() {
    const entryTarget = await this.accountRepository.findCashVaultEntryTarget();
    if (!entryTarget) {
      throw new Error('cash_vault_entry_target_not_configured');
    }
    return entryTarget;
  }
}
