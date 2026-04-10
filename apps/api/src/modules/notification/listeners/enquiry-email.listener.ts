import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ENQUIRY_EVENTS } from '@shared/events/event-constants';
import { EnquiryCreatedEvent, EnquiryStatusUpdatedEvent } from '@modules/enquiry/events';
import { DatabaseProvider } from '@core/database/database.provider';
import { EmailService } from '../services/email.service';

@Injectable()
export class EnquiryEmailListener {
  private readonly logger = new Logger(EnquiryEmailListener.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseProvider,
  ) {}

  @OnEvent(ENQUIRY_EVENTS.ENQUIRY_CREATED)
  async handleEnquiryCreated(event: EnquiryCreatedEvent) {
    this.logger.log(`Processing enquiry created event for enquiry ${event.enquiryId}`);

    const adminRecipient = this.configService.get<string>('email.adminRecipient');
    if (!adminRecipient) {
      this.logger.warn('EMAIL_ADMIN_RECIPIENT is not configured, skipping admin notification');
      return;
    }

    try {
      const enquiry = await this.db.enquiry.findUnique({
        where: { id: event.enquiryId },
        include: { items: true },
      });

      if (!enquiry) {
        this.logger.warn(`Enquiry ${event.enquiryId} not found, skipping email`);
        return;
      }

      await this.emailService.sendEmail({
        to: adminRecipient,
        subject: `New Enquiry #${enquiry.enquiryNumber || event.enquiryId}`,
        templateName: 'enquiry-created-admin',
        templateData: {
          enquiryId: event.enquiryId,
          enquiryNumber: enquiry.enquiryNumber,
          customerName: enquiry.customerName,
          customerEmail: enquiry.email,
          companyName: enquiry.companyName,
          itemCount: event.itemCount,
          grandTotal: enquiry.grandTotal ? Number(enquiry.grandTotal) : null,
          status: enquiry.status,
          createdAt: event.occurredAt,
          items: enquiry.items.map((item: { sku: string; qty: number; price: unknown; total: unknown }) => ({
            sku: item.sku,
            quantity: item.qty,
            price: item.price ? Number(item.price) : null,
            total: item.total ? Number(item.total) : null,
          })),
        },
      });

      this.logger.log(`Admin notification email sent for enquiry ${event.enquiryId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send admin email for enquiry ${event.enquiryId}: ${message}`);
    }
  }

  @OnEvent(ENQUIRY_EVENTS.ENQUIRY_STATUS_UPDATED)
  async handleEnquiryStatusUpdated(event: EnquiryStatusUpdatedEvent) {
    this.logger.log(
      `Processing enquiry status updated event for enquiry ${event.enquiryId}: ${event.previousStatus} -> ${event.newStatus}`,
    );

    try {
      const enquiry = await this.db.enquiry.findUnique({
        where: { id: event.enquiryId },
      });

      if (!enquiry || !enquiry.email) {
        this.logger.warn(
          `Enquiry ${event.enquiryId} or its email not found, skipping customer notification`,
        );
        return;
      }

      await this.emailService.sendEmail({
        to: enquiry.email,
        subject: `Your Enquiry #${enquiry.enquiryNumber || event.enquiryId} - Status Updated`,
        templateName: 'enquiry-status-update',
        templateData: {
          customerName: enquiry.customerName,
          enquiryId: event.enquiryId,
          enquiryNumber: enquiry.enquiryNumber,
          previousStatus: event.previousStatus,
          newStatus: event.newStatus,
          notes: event.notes,
          updatedAt: event.occurredAt,
        },
      });

      this.logger.log(`Status update email sent to ${enquiry.email} for enquiry ${event.enquiryId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send status email for enquiry ${event.enquiryId}: ${message}`);
    }
  }
}
