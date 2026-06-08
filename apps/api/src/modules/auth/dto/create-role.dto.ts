import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';
import { RolePermissions } from '../entities';

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @IsObject()
  @IsOptional()
  permissions?: RolePermissions;

  @IsString()
  organizationId: string;
}
