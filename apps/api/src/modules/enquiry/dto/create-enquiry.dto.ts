import { IsString, IsOptional } from 'class-validator';

export class CreateEnquiryDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
