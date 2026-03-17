import {
  IsString,
  IsOptional,
  IsInt,
  Matches,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class AttributeOptionImportDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Attribute slug must be lowercase alphanumeric with hyphens only',
  })
  attributeSlug: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  value: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  rowNumber?: number;
}

export interface AttributeOptionImportResult {
  valid: AttributeOptionImportDto[];
  invalid: Array<{
    rowNumber: number;
    attributeSlug: string;
    errors: string[];
  }>;
  invalidAttributeSlugs: string[];
}
