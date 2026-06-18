import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService, UserNotFoundError, EmailAlreadyExistsError, UserDeactivatedError, UserAlreadyDeactivatedError } from '@shared/domain';
import { AUTH_EVENTS } from '@shared/events';
import { UserRepository } from '../repositories';
import { UserEntity } from '../entities';
import { UserCreatedEvent, UserUpdatedEvent, UserDeactivatedEvent } from '../events';

@Injectable()
export class UserService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly userRepo: UserRepository,
  ) {
    super(eventEmitter);
  }

  async create(
    email: string,
    passwordHash: string,
    name?: string,
  ): Promise<UserEntity> {
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new EmailAlreadyExistsError(email);
    }

    const user = await this.userRepo.create({
      email,
      passwordHash,
      name,
    });

    this.emit(
      AUTH_EVENTS.USER_CREATED,
      new UserCreatedEvent(user.id, user.email, user.name),
    );

    return user;
  }

  async getById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  async getByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo.findByEmail(email);
  }

  async update(
    id: string,
    data: Partial<{
      email: string;
      passwordHash: string;
      name: string;
      isActive: boolean;
      lastLoginAt: Date;
    }>,
  ): Promise<UserEntity> {
    const user = await this.getById(id);

    const changes: Record<string, unknown> = {};
    for (const key of Object.keys(data)) {
      const typedKey = key as keyof typeof data;
      if (data[typedKey] !== undefined) {
        changes[key] = {
          from: user[typedKey as keyof UserEntity],
          to: data[typedKey],
        };
      }
    }

    const updatedUser = await this.userRepo.update(id, data);

    this.emit(
      AUTH_EVENTS.USER_UPDATED,
      new UserUpdatedEvent(
        updatedUser.id,
        updatedUser.email,
        updatedUser.name,
        updatedUser.isActive,
        changes,
      ),
    );

    return updatedUser;
  }

  async deactivate(id: string): Promise<UserEntity> {
    const user = await this.getById(id);

    if (!user.isActive) {
      throw new UserAlreadyDeactivatedError(id);
    }

    const deactivatedUser = await this.userRepo.update(id, { isActive: false });

    this.emit(
      AUTH_EVENTS.USER_DEACTIVATED,
      new UserDeactivatedEvent(
        deactivatedUser.id,
        deactivatedUser.email,
        deactivatedUser.name,
      ),
    );

    return deactivatedUser;
  }

  async recordLogin(id: string): Promise<UserEntity> {
    return this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async isEmailUnique(email: string): Promise<boolean> {
    const user = await this.userRepo.findByEmail(email);
    return user === null;
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    await this.userRepo.delete(id);
  }

  async assertActive(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new UserNotFoundError(userId);
    }

    if (!user.isActive) {
      throw new UserDeactivatedError(userId);
    }
  }
}
