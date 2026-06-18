import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  @MaxLength(255)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  sku?: string;

  @IsOptional()
  @ValidateIf((o) => o.imageUrl === null || o.imageUrl === undefined || typeof o.imageUrl === 'string')
  @Matches(/^(https?:\/\/|\/)[^\s]+$/, {
    message: 'imageUrl must be a valid URL or relative path starting with /',
  })
  imageUrl?: string | null;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  displayMode?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
