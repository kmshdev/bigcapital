import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
} from 'class-validator';

export class ReplaceCashVaultDesignatedAdminsDto {
  @ApiProperty({ type: [Number], maxItems: 2 })
  @IsArray()
  @ArrayMaxSize(2)
  userIds!: number[];
}

export class GrantCashVaultUnlockDto {
  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  userId!: number;

  @ApiProperty({ enum: ['entry', 'manage'] })
  @IsIn(['entry', 'manage'])
  purpose!: 'entry' | 'manage';

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  expiresAt!: string;
}
