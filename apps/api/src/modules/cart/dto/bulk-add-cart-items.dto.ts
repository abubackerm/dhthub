import { IsArray, IsString, IsNotEmpty, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkCartItem {
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  sku: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  qty: number;
}

export class BulkAddCartItemsDto {
  @IsArray({ message: 'Items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => BulkCartItem)
  items: BulkCartItem[];
}
