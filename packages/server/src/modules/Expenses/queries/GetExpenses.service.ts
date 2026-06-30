import * as R from 'ramda';
import { ExpenseTransfromer } from './Expense.transformer';
import { DynamicListService } from '@/modules/DynamicListing/DynamicList.service';
import { TransformerInjectable } from '@/modules/Transformer/TransformerInjectable.service';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { IPaginationMeta } from '../Expenses.types';
import { GetExpensesQueryDto } from '../dtos/GetExpensesQuery.dto';
import { Expense } from '../models/Expense.model';
import { IFilterMeta } from '@/interfaces/Model';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { CashVaultAccessService } from '@/modules/CashVault/CashVaultAccess.service';

@Injectable()
export class GetExpensesService {
  constructor(
    private readonly transformer: TransformerInjectable,
    private readonly dynamicListService: DynamicListService,

    @Inject(Expense.name)
    private readonly expense: TenantModelProxy<typeof Expense>,

    @Optional()
    private readonly cashVaultAccess?: CashVaultAccessService,
  ) {}

  /**
   * Retrieve expenses paginated list.
   * @param  {GetExpensesQueryDto} filterDTO
   * @return {IExpense[]}
   */
  public async getExpensesList(filterDTO: GetExpensesQueryDto): Promise<{
    data: Expense[];
    pagination: IPaginationMeta;
    filterMeta: IFilterMeta;
  }> {
    const _filterDto = {
      sortOrder: 'desc',
      columnSortBy: 'created_at',
      page: 1,
      pageSize: 12,
      ...filterDTO,
    };
    // Parses list filter DTO.
    const filter = this.parseListFilterDTO(_filterDto);

    // Dynamic list service.
    const dynamicList = await this.dynamicListService.dynamicList(
      this.expense(),
      filter,
    );
    const shouldHideCashVaultExpenses =
      !(filterDTO as any).includeCashVaultExpenses &&
      (await this.shouldHideCashVaultExpenses(
        (filterDTO as any).cashVaultAccess,
      ));
    // Retrieves the paginated results.
    const { results, pagination } = await this.expense()
      .query()
      .onBuild((builder) => {
        builder.withGraphFetched('paymentAccount');
        builder.withGraphFetched('categories.expenseAccount');
        if (shouldHideCashVaultExpenses) {
          this.filterCashVaultPaymentAccounts(builder);
        }

        dynamicList.buildQuery()(builder);
        _filterDto?.filterQuery && _filterDto?.filterQuery(builder);
      })
      .pagination(filter.page - 1, filter.pageSize);

    // Transformes the expenses models to POJO.
    const data = await this.transformer.transform(
      results,
      new ExpenseTransfromer(),
    );
    return {
      data,
      pagination,
      filterMeta: dynamicList.getResponseMeta(),
    };
  }

  /**
   * Parses filter DTO of expenses list.
   * @param filterDTO -
   */
  private parseListFilterDTO(filterDTO) {
    return R.compose(this.dynamicListService.parseStringifiedFilter)(filterDTO);
  }

  private async shouldHideCashVaultExpenses(accessContext?: any) {
    const access =
      accessContext || (await this.cashVaultAccess?.getCurrentUserAccess());
    if (!access || !this.cashVaultAccess) {
      return true;
    }
    return !this.cashVaultAccess.canViewCashVault(access).allowed;
  }

  private filterCashVaultPaymentAccounts(builder) {
    builder.whereNotExists((subquery) => {
      subquery
        .select(1)
        .from('accounts')
        .whereColumn('accounts.id', 'expenses_transactions.payment_account_id')
        .where('accounts.is_cash_vault', true);
    });
  }
}
