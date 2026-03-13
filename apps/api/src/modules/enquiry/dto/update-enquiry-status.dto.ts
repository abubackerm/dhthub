import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EnquiryStatus } from '../entities/enquiry-status.enum';

export class UpdateEnquiryStatusDto {
  @IsEnum(EnquiryStatus, {
    message: 'Status must be a valid EnquiryStatus (SUBMITTED, UNDER_REVIEW, RESPONDED, CLOSED)',
  })
  status: EnquiryStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}
