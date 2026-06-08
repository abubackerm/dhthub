import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @MinLength(3, { message: 'SKU must be at least 3 characters' })
  @MaxLength(50, { message: 'SKU must be at most 50 characters' })
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'SKU must be uppercase alphanumeric with hyphens only',
  })
  sku: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
