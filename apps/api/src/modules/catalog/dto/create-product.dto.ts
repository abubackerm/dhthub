import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export enum ProductTypeDto {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  cellId?: string;

  @IsOptional()
  @IsEnum(ProductTypeDto)
  type?: ProductTypeDto;

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
  isFeatured?: boolean;
}
