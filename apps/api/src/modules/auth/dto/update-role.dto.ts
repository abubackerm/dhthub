import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';
import { RolePermissions } from '../entities';

export class UpdateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  permissions?: RolePermissions;
}
