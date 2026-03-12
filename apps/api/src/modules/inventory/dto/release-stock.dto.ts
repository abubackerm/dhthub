import { IsString, IsOptional } from 'class-validator';

export class ReleaseStockDto {
  @IsString()
  referenceId: string;

  @IsOptional()
  @IsString()
  referenceType?: string;
}
