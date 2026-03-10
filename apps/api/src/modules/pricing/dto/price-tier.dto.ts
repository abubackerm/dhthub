import { IsInt, IsPositive, IsOptional, Max, Min } from 'class-validator';

export class PriceTierDto {
  @IsInt()
  @Min(1)
  @Max(999999)
  minQty: number;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(999999)
  maxQty: number | null;

  @IsPositive()
  unitPrice: number;
}
