import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { UserService } from '../services';
import { CreateUserDto, UpdateUserDto, UserView } from '../dto';

@Controller('auth/users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserView> {
    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.userService.create(
      dto.email,
      passwordHash,
      dto.name,
    );
    return UserView.fromEntity(user);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<UserView> {
    const user = await this.userService.getById(id);
    return UserView.fromEntity(user);
  }

  @Get('email/:email')
  async getByEmail(@Param('email') email: string): Promise<UserView | null> {
    const user = await this.userService.getByEmail(email);
    return user ? UserView.fromEntity(user) : null;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserView> {
    const updateData: Record<string, unknown> = {};
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.lastLoginAt !== undefined)
      updateData.lastLoginAt = new Date(dto.lastLoginAt);
    if (dto.password !== undefined) {
      updateData.passwordHash = await this.hashPassword(dto.password);
    }

    const user = await this.userService.update(id, updateData);
    return UserView.fromEntity(user);
  }

  @Post(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<UserView> {
    const user = await this.userService.deactivate(id);
    return UserView.fromEntity(user);
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 10);
  }
}
