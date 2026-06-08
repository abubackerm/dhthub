import {
  IsString,
  IsInt,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateAttributeOptionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  label: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  value: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
