import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttributeValueInputDto {
  @IsString()
  @IsNotEmpty()
  attributeId: string;

  @IsOptional()
  @IsNumber()
  numberValue?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  textValue?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  optionId?: string;

  @IsOptional()
  @IsBoolean()
  booleanValue?: boolean;
}

export class AssignVariantAttributesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueInputDto)
  attributes: AttributeValueInputDto[];
}
