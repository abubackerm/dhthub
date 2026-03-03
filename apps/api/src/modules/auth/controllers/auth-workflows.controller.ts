import { Controller } from '@nestjs/common';

/**
 * Placeholder controller for business workflows.
 *
 * Reserved for future implementation:
 * - POST /login - Authentication
 * - POST /invite - Invite user
 * - POST /accept - Accept invitation
 * - POST /transfer-ownership - Change organization owner
 *
 * Rule: CRUD operations go to resource controllers.
 * Business workflows go to this controller.
 * Never mix them.
 */
@Controller('v1/auth/workflows')
export class AuthWorkflowsController {
  // Future workflow endpoints will be implemented here
}
