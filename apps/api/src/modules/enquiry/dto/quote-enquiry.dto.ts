import { IsArray } from 'class-validator';

export class QuoteItemDto {
  itemId: string;
  price: number;
}

export class QuoteEnquiryDto {
  @IsArray()
  items: QuoteItemDto[];
}
