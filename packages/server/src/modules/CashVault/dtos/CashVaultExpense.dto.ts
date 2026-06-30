import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ToNumber } from '@/common/decorators/Validators';

class CashVaultExpenseCategoryDto {
  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  expenseAccountId!: number;

  @ApiProperty({ type: Number, minimum: 0.01 })
  @ToNumber()
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  description?: string;
}

export class CreateCashVaultExpenseDto {
  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  @IsNotEmpty()
  paymentDate!: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  referenceNo?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: Number })
  @ToNumber()
  @IsInt()
  @IsOptional()
  payeeId?: number;

  @ApiProperty({
    type: [CashVaultExpenseCategoryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashVaultExpenseCategoryDto)
  categories!: CashVaultExpenseCategoryDto[];
}
