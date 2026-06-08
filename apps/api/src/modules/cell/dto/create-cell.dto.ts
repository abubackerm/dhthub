import { IsString, IsOptional, IsBoolean, IsInt, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreateCellDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @ValidateIf((o) => o.imageUrl === null || o.imageUrl === undefined || typeof o.imageUrl === 'string')
  @IsString()
  imageUrl?: string | null;

  @IsString()
  @IsNotEmpty()
  categoryId: string;
}
