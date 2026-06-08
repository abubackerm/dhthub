import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';

export class AssignAttributeDto {
  @IsString()
  @IsNotEmpty()
  attributeId: string;

  @IsInt()
  @Min(0)
  displayOrder?: number;
}
