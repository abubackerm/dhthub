import { EnquiryStatus } from '../entities/enquiry-status.enum';

export class EnquiryStatusUpdatedEvent {
  constructor(
    public readonly enquiryId: string,
    public readonly previousStatus: EnquiryStatus,
    public readonly newStatus: EnquiryStatus,
    public readonly notes: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
