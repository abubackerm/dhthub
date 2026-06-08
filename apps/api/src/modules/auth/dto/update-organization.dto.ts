import { IsString, Matches, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with hyphens only',
  })
  @MaxLength(50)
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;
}
