import { IsEmail, IsString, IsIn } from 'class-validator';

export type AdminRole = 'super_admin' | 'admin' | 'dealer' | 'user';

export class CreateUserAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsString()
  @IsIn(['super_admin', 'admin', 'dealer', 'user'])
  role: AdminRole;
}
