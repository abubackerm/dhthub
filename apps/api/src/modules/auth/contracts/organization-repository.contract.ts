import { OrganizationEntity } from '../entities';

export interface OrganizationRepositoryContract {
  findAll(): Promise<OrganizationEntity[]>;
  findById(id: string): Promise<OrganizationEntity | null>;
  findBySlug(slug: string): Promise<OrganizationEntity | null>;
  findByOwnerId(ownerId: string): Promise<OrganizationEntity[]>;
  create(data: {
    name: string;
    slug: string;
    ownerId: string;
  }): Promise<OrganizationEntity>;
  update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      ownerId: string;
    }>,
  ): Promise<OrganizationEntity>;
  delete(id: string): Promise<OrganizationEntity>;
  count(where?: Record<string, any>): Promise<number>;
}
