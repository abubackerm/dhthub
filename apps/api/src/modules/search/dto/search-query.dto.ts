import { IsBoolean, IsInt, IsNumber, IsObject, IsOptional, IsString, Max, Min, registerDecorator, ValidationArguments, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'safeAttributeKeys', async: false })
class SafeAttributeKeysConstraint implements ValidatorConstraintInterface {
  validate(value: Record<string, string | number>): boolean {
    if (!value || typeof value !== 'object') return true;
    const safeKeyPattern = /^[a-zA-Z0-9_-]+$/;
    return Object.keys(value).every((key) => safeKeyPattern.test(key));
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Attribute keys must match pattern ^[a-zA-Z0-9_-]+$';
  }
}

function SafeAttributeKeys(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: SafeAttributeKeysConstraint,
    });
  };
}

export class SearchQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priceMax?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  inStock?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsObject()
  @SafeAttributeKeys()
  attributes?: Record<string, string | number>;

  @IsOptional()
  @IsString()
  facets?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: string;
}
