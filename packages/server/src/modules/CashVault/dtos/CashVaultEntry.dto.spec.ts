import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCashVaultEntryDto } from './CashVaultEntry.dto';

const validate = (input: Record<string, unknown>) => {
  const dto = plainToInstance(CreateCashVaultEntryDto, input);
  return validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
};

describe('CreateCashVaultEntryDto', () => {
  const valid = {
    transactionType: 'deposit',
    amount: 2500,
    date: '2026-06-27',
    description: 'Owner cash infusion',
    offsetAccountId: 44,
  };

  it('accepts deposit and withdrawal entries only', () => {
    expect(validate(valid)).toHaveLength(0);
    expect(validate({ ...valid, transactionType: 'withdrawal' })).toHaveLength(
      0,
    );
    expect(validate({ ...valid, transactionType: 'transfer' })).not.toHaveLength(
      0,
    );
  });

  it('requires a positive INR amount and date', () => {
    expect(validate({ ...valid, amount: 0 })).not.toHaveLength(0);
    expect(validate({ ...valid, amount: -1 })).not.toHaveLength(0);
    expect(validate({ ...valid, date: undefined })).not.toHaveLength(0);
  });

  it('rejects hidden Cash Vault account ids in the request body', () => {
    expect(
      validate({
        ...valid,
        cashflowAccountId: 99,
        cashVaultAccountId: 99,
      }),
    ).not.toHaveLength(0);
  });
});
