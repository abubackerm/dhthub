import {
  IsString,
  IsInt,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { MovementReason } from '../entities';

export class AdjustStockDto {
  @IsString()
  variantId: string;

  @IsString()
  warehouseId: string;

  @IsInt()
  quantity: number;

  @IsOptional()
  @IsEnum(MovementReason)
  reason?: MovementReason;
}
