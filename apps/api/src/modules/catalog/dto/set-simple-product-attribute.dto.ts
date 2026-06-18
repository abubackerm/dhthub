import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class SetSimpleProductAttributeDto {
  @IsString()
  attributeId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rawValue?: string;

  @IsOptional()
  @IsNumber()
  numberValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  textValue?: string;

  @IsOptional()
  @IsString()
  optionId?: string;

  @IsOptional()
  @IsBoolean()
  booleanValue?: boolean;
}
