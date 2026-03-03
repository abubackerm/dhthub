import { UserEntity } from '../entities';

export interface UserRepositoryContract {
  findAll(): Promise<UserEntity[]>;
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: {
    email: string;
    passwordHash: string;
    name?: string;
  }): Promise<UserEntity>;
  update(
    id: string,
    data: Partial<{
      email: string;
      passwordHash: string;
      name: string;
      isActive: boolean;
      lastLoginAt: Date;
    }>,
  ): Promise<UserEntity>;
  delete(id: string): Promise<UserEntity>;
  count(where?: Record<string, any>): Promise<number>;
}
