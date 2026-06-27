import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class DesignateCashVaultAccountDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  accountId!: number;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  entryEnabled?: boolean;
}

export class CashVaultAccountDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['cash'] })
  accountType!: string;

  @ApiProperty()
  isCashVault!: boolean;

  @ApiProperty()
  cashVaultEntryEnabled!: boolean;
}
