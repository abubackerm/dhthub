import { IsString, IsInt, IsPositive, MinLength, MaxLength, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class PriceCalculationQueryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  @Max(9999999)
  qty: number;
}
