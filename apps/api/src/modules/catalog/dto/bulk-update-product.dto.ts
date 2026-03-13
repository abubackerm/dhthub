import {
  IsArray,
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatusDto } from './update-product.dto';

export class BulkUpdateFieldsDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto;

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

export class BulkUpdateProductDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  ids: string[];

  @ValidateNested()
  @Type(() => BulkUpdateFieldsDto)
  data: BulkUpdateFieldsDto;
}
