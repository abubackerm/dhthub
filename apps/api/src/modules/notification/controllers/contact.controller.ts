import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import axios from 'axios';
import { EmailService } from '../services/email.service';
import { SendContactEmailDto } from '../dto';

@Controller('contact')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async sendContactEmail(@Body() dto: SendContactEmailDto) {
    await this.verifyRecaptcha(dto.recaptchaToken);

    const adminRecipient = this.configService.get<string>('email.adminRecipient');
    if (!adminRecipient) {
      this.logger.error('EMAIL_ADMIN_RECIPIENT is not configured');
      throw new Error('Email service is not properly configured');
    }

    await this.emailService.sendEmail({
      to: adminRecipient,
      subject: `Contact Form: ${dto.service || 'General Inquiry'} from ${dto.name}`,
      templateName: 'contact-form',
      templateData: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone || 'Not provided',
        service: dto.service || 'General Inquiry',
        message: dto.message,
        createdAt: new Date().toISOString(),
      },
      replyTo: dto.email,
    });

    return { success: true, message: 'Thank you for your message! We will get back to you soon.' };
  }

  private async verifyRecaptcha(token?: string): Promise<void> {
    const skipRecaptcha = this.configService.get<boolean>('recaptcha.skip');

    if (skipRecaptcha) {
      this.logger.warn('reCAPTCHA verification skipped (SKIP_RECAPTCHA=true)');
      return;
    }

    if (!token) {
      throw new Error('reCAPTCHA token is required');
    }

    const secretKey = this.configService.get<string>('recaptcha.secretKey');
    if (!secretKey) {
      this.logger.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
      return;
    }

    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        new URLSearchParams({
          secret: secretKey,
          response: token,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      if (!response.data.success) {
        this.logger.warn(`reCAPTCHA verification failed: ${JSON.stringify(response.data['error-codes'])}`);
        throw new Error('reCAPTCHA verification failed');
      }

      if (response.data.score !== undefined && response.data.score < 0.5) {
        this.logger.warn(`reCAPTCHA score too low: ${response.data.score}`);
        throw new Error('reCAPTCHA verification failed');
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'reCAPTCHA verification failed') {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`reCAPTCHA verification error: ${message}`);
      throw new Error('reCAPTCHA verification failed');
    }
  }
}
