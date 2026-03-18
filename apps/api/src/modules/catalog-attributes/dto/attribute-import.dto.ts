import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';

export enum AttributeDataTypeDto {
  NUMBER = 'number',
  TEXT = 'text',
  ENUM = 'enum',
  BOOLEAN = 'boolean',
}

export enum AttributeFilterTypeDto {
  RANGE = 'RANGE',
  CHECKBOX = 'CHECKBOX',
  SELECT = 'SELECT',
}

export class AttributeImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;

  @IsEnum(AttributeDataTypeDto)
  dataType: AttributeDataTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  group?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsEnum(AttributeFilterTypeDto)
  filterType?: AttributeFilterTypeDto;

  @IsOptional()
  @IsString()
  unitSymbol?: string;

  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  rowNumber?: number;
}

export interface AttributeImportResult {
  valid: AttributeImportDto[];
  invalid: Array<{
    rowNumber: number;
    slug: string;
    errors: string[];
  }>;
  duplicateSlugs: string[];
}
