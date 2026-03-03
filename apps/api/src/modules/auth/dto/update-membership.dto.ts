import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MembershipStatus } from '../entities';

export class UpdateMembershipDto {
  @IsString()
  @IsOptional()
  roleId?: string;

  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;
}
