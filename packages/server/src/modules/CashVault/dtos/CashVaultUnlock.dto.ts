import { ToNumber } from '@/common/decorators/Validators';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDateString, IsInt } from 'class-validator';

export class ReplaceCashVaultDesignatedAdminsDto {
  @ApiProperty({ type: [Number], maxItems: 2 })
  @IsArray()
  @ArrayMaxSize(2)
  userIds!: number[];

  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  designatedByUserId!: number;
}

export class GrantCashVaultUnlockDto {
  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  userId!: number;

  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  grantedByUserId!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  expiresAt!: string;
}

export class RevokeCashVaultUnlockDto {
  @ApiProperty({ type: Number })
  @ToNumber()
  @IsInt()
  revokedByUserId!: number;
}
