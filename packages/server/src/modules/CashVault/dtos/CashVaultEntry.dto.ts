import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCashVaultEntryDto {
  @ApiProperty({ enum: ['deposit', 'withdrawal'] })
  @IsIn(['deposit', 'withdrawal'])
  transactionType!: 'deposit' | 'withdrawal';

  @ApiProperty({ type: Number, minimum: 0.01 })
  @ToNumber()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  referenceNo?: string;

  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  offsetAccountId!: number;

  @ApiPropertyOptional({ type: Number })
  @ToNumber()
  @IsInt()
  @IsOptional()
  branchId?: number;
}

export class CashVaultEntryResponseDto {
  @ApiProperty({ type: Number })
  transactionId!: number;

  @ApiProperty({ enum: ['deposit', 'withdrawal'] })
  transactionType!: 'deposit' | 'withdrawal';

  @ApiProperty({ type: Number })
  amount!: number;

  @ApiProperty({ type: String, format: 'date' })
  date!: string;
}
