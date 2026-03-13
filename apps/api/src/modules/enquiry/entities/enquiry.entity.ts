import { BaseEntity } from '@shared/common/base.entity';
import { EnquiryStatus } from './enquiry-status.enum';

export class EnquiryEntity extends BaseEntity {
  userId: string;
  status: EnquiryStatus;
  notes: string | null;
}
