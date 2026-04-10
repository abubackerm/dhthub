import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_EVENTS } from '@shared/events/event-constants';
import { EmailService } from '../services/email.service';

export interface PasswordResetRequestedEvent {
  user: { id: string; name?: string | null; email: string };
  url: string;
  occurredAt: Date;
}

@Injectable()
export class AuthEmailListener {
  private readonly logger = new Logger(AuthEmailListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent(AUTH_EVENTS.PASSWORD_RESET_REQUESTED)
  async handlePasswordResetRequested(event: PasswordResetRequestedEvent) {
    this.logger.log(`Processing password reset request for user ${event.user.email}`);

    try {
      await this.emailService.sendEmail({
        to: event.user.email,
        subject: 'Reset Your Password - DHT',
        templateName: 'password-reset',
        templateData: {
          name: event.user.name || 'User',
          resetUrl: event.url,
          requestedAt: event.occurredAt,
        },
      });

      this.logger.log(`Password reset email sent to ${event.user.email}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send password reset email to ${event.user.email}: ${message}`);
    }
  }
}
