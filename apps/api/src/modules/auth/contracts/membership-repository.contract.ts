import { MembershipEntity, MembershipStatus } from '../entities';

export interface MembershipRepositoryContract {
  findAll(): Promise<MembershipEntity[]>;
  findById(id: string): Promise<MembershipEntity | null>;
  findByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<MembershipEntity | null>;
  findByUserId(userId: string): Promise<MembershipEntity[]>;
  findByOrganizationId(organizationId: string): Promise<MembershipEntity[]>;
  findByOrganizationIdAndStatus(
    organizationId: string,
    status: MembershipStatus,
  ): Promise<MembershipEntity[]>;
  create(data: {
    userId: string;
    organizationId: string;
    roleId: string;
    status?: MembershipStatus;
  }): Promise<MembershipEntity>;
  update(
    id: string,
    data: Partial<{
      roleId: string;
      status: MembershipStatus;
    }>,
  ): Promise<MembershipEntity>;
  updateStatus(id: string, status: MembershipStatus): Promise<MembershipEntity>;
  count(where?: Record<string, any>): Promise<number>;
  countByStatus(organizationId: string, status: MembershipStatus): Promise<number>;
}
