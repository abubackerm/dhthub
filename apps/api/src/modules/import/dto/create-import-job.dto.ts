import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { ImportFileType } from '../entities';

export class CreateImportJobDto {
  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @IsEnum(ImportFileType)
  type: ImportFileType;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalRows?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;
}
