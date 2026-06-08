import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnquiryStatus } from '../entities/enquiry-status.enum';

export class AdminListEnquiriesDto {
  @IsEnum(EnquiryStatus)
  @IsOptional()
  status?: EnquiryStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  page?: string;

  @IsString()
  @IsOptional()
  limit?: string;
}
