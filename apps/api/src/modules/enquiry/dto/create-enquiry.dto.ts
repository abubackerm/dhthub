import { IsString, IsOptional, IsEmail, IsArray } from 'class-validator';

export class CreateEnquiryItemDto {
  variantId: string;
  qty: number;
}

export class CreateEnquiryDto {
  @IsString()
  customerName: string;

  @IsString()
  @IsOptional()
  companyName?: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  items: CreateEnquiryItemDto[];
}
