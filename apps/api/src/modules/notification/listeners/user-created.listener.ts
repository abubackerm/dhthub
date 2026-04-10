import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_EVENTS } from '@shared/events/event-constants';
import { EmailService } from '../services/email.service';

export interface UserCreatedByAdminEvent {
  user: { id: string; name?: string | null; email: string; role?: string };
  password: string;
  loginUrl: string;
  createdAt: Date;
}

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent(AUTH_EVENTS.USER_CREATED_BY_ADMIN)
  async handleUserCreatedByAdmin(event: UserCreatedByAdminEvent) {
    this.logger.log(`Processing user created by admin for ${event.user.email}`);

    try {
      await this.emailService.sendEmail({
        to: event.user.email,
        subject: 'Your Account Has Been Created - DHT',
        templateName: 'user-created',
        templateData: {
          name: event.user.name || 'User',
          email: event.user.email,
          password: event.password,
          loginUrl: event.loginUrl,
          createdAt: event.createdAt,
        },
      });

      this.logger.log(`Welcome email sent to ${event.user.email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send welcome email to ${event.user.email}: ${message}`);
    }
  }
}
