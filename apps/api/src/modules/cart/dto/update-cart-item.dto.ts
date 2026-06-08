import { IsInt, Min, Max } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(10000, { message: 'Quantity cannot exceed 10000' })
  qty: number;
}
