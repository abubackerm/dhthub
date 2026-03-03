import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import {
  UserRepository,
  OrganizationRepository,
  MembershipRepository,
  RoleRepository,
} from './repositories';
import {
  UserService,
  OrganizationService,
  MembershipService,
  RoleService,
} from './services';
import {
  UsersController,
  OrganizationsController,
  RolesController,
  MembershipsController,
  AuthWorkflowsController,
} from './controllers';

@Module({
  imports: [EventEmitterModule.forRoot()],
  controllers: [
    UsersController,
    OrganizationsController,
    RolesController,
    MembershipsController,
    AuthWorkflowsController,
  ],
  providers: [
    UserRepository,
    OrganizationRepository,
    MembershipRepository,
    RoleRepository,
    UserService,
    OrganizationService,
    MembershipService,
    RoleService,
  ],
  exports: [
    UserRepository,
    OrganizationRepository,
    MembershipRepository,
    RoleRepository,
    UserService,
    OrganizationService,
    MembershipService,
    RoleService,
  ],
})
export class AuthModule {}
