import {
  IsString,
  IsInt,
  Min,
  IsOptional,
  IsDateString,
} from 'class-validator';

export class ReserveStockDto {
  @IsString()
  variantId: string;

  @IsString()
  warehouseId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  referenceId: string;

  @IsString()
  referenceType: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
