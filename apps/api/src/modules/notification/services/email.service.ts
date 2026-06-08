import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { MsalService } from './msal.service';
import { TemplateService } from './template.service';

export interface SendEmailParams {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  templateName: string;
  templateData: Record<string, unknown>;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(
    private readonly configService: ConfigService,
    private readonly msalService: MsalService,
    private readonly templateService: TemplateService,
  ) {}

  async sendEmail(params: SendEmailParams): Promise<void> {
    const { to, cc, bcc, subject, templateName, templateData, replyTo } = params;

    const fromAddress = this.configService.get<string>('email.from');
    if (!fromAddress) {
      throw new Error('EMAIL_FROM is not configured');
    }

    const recipients = Array.isArray(to) ? to : [to];
    const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
    const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [];

    let htmlBody: string;
    try {
      htmlBody = await this.templateService.render(templateName, templateData);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to render email template "${templateName}": ${message}`);
    }

    const message: Record<string, unknown> = {
      subject,
      body: {
        contentType: 'HTML',
        content: htmlBody,
      },
      toRecipients: recipients.map((email) => ({
        emailAddress: { address: email },
      })),
    };

    if (ccRecipients.length > 0) {
      message.ccRecipients = ccRecipients.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    if (bccRecipients.length > 0) {
      message.bccRecipients = bccRecipients.map((email) => ({
        emailAddress: { address: email },
      }));
    }

    if (replyTo) {
      message.replyTo = [
        {
          emailAddress: { address: replyTo },
        },
      ];
    }

    const accessToken = await this.msalService.getAccessToken();

    try {
      await axios.post(
        `${this.graphBaseUrl}/users/${encodeURIComponent(fromAddress)}/sendMail`,
        {
          message,
          saveToSentItems: false,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Email sent successfully to ${recipients.join(', ')} [template: ${templateName}]`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (axios.isAxiosError(error) && error.response) {
        this.logger.error(
          `Microsoft Graph API error (${error.response.status}): ${JSON.stringify(error.response.data)}`,
        );
      }
      throw new Error(`Failed to send email via Microsoft Graph API: ${message}`);
    }
  }
}
