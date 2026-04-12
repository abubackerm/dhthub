import { IsString, IsBoolean, IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CategoryQueryDto {
  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => value !== undefined && value !== null ? parseInt(value, 10) : undefined)
  maxDepth?: number;
}
