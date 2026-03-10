import { IsString, MinLength, MaxLength, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PriceTierDto } from './price-tier.dto';

export class CreateVariantPricingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceTierDto)
  tiers: PriceTierDto[];
}
