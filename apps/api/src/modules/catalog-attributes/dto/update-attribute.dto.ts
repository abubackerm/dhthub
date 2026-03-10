import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAttributeDto } from './create-attribute.dto';

export class UpdateAttributeDto extends PartialType(
  OmitType(CreateAttributeDto, ['slug'] as const),
) {}
