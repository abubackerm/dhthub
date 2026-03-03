import { IsString, IsEnum, IsOptional } from 'class-validator';
import { MembershipStatus } from '../entities';

export class CreateMembershipDto {
  @IsString()
  userId: string;

  @IsString()
  organizationId: string;

  @IsString()
  roleId: string;

  @IsEnum(MembershipStatus)
  @IsOptional()
  status?: MembershipStatus;
}
