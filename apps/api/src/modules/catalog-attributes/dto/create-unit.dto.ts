import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10)
  symbol: string;
}
