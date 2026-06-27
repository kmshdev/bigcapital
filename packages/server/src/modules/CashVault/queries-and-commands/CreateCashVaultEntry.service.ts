import { Injectable } from '@nestjs/common';
import { AccountRepository } from '@/modules/Accounts/repositories/Account.repository';
import { BankingTransactionsApplication } from '@/modules/BankingTransactions/BankingTransactionsApplication.service';
import { CreateCashVaultEntryDto } from '../dtos/CashVaultEntry.dto';

@Injectable()
export class CreateCashVaultEntryService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly bankingTransactionsApplication: BankingTransactionsApplication,
  ) {}

  public async createEntry(entryDto: CreateCashVaultEntryDto) {
    const entryTarget = await this.accountRepository.findCashVaultEntryTarget();
    if (!entryTarget) {
      throw new Error('cash_vault_entry_target_not_configured');
    }
    const transaction = await this.bankingTransactionsApplication.createTransaction(
      {
        date: entryDto.date as any,
        transactionType: entryDto.transactionType,
        description: entryDto.description,
        amount: entryDto.amount,
        exchangeRate: 1,
        currencyCode: 'INR',
        creditAccountId: entryDto.offsetAccountId,
        cashflowAccountId: entryTarget.id,
        publish: true,
        referenceNo: entryDto.referenceNo,
        branchId: entryDto.branchId,
      },
    );

    return {
      transactionId: transaction.id,
      transactionType: entryDto.transactionType,
      amount: entryDto.amount,
      date: entryDto.date,
    };
  }
}
