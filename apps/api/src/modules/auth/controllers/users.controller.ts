import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomBytes } from 'crypto';
import { UserService } from '../services';
import { CreateUserDto, CreateUserAdminDto, UpdateUserDto, UserView } from '../dto';
import { AuthGuard } from '../auth.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';
import { AUTH_EVENTS } from '@shared/events/event-constants';
import { auth } from '../auth';
import { FastifyRequest } from 'fastify';

@Controller('auth/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class UsersController {
  constructor(
    private readonly userService: UserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

  @Post('create-with-password')
  async createWithGeneratedPassword(
    @Body() dto: CreateUserAdminDto,
    @Req() request: FastifyRequest,
  ): Promise<{ id: string; name: string | null; email: string; role: string }> {
    const password = this.generateSecurePassword();

    let createdUser;
    try {
      createdUser = await auth.api.createUser({
        headers: request.headers as Record<string, string>,
        body: {
          email: dto.email,
          name: dto.name,
          password,
          role: dto.role,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      throw new Error(message);
    }

    const user = createdUser.user;
    const webUrl = process.env.WEB_URL || 'http://localhost:3005';

    this.eventEmitter.emit(AUTH_EVENTS.USER_CREATED_BY_ADMIN, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: dto.role,
      },
      password,
      loginUrl: `${webUrl}/sign-in`,
      createdAt: new Date(),
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: dto.role,
    };
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

  private generateSecurePassword(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    const bytes = randomBytes(length);
    return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 10);
  }
}
