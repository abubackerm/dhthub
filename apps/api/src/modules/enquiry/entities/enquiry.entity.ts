import { BaseEntity } from '@shared/common/base.entity';
import { EnquiryStatus } from './enquiry-status.enum';

export class EnquiryEntity extends BaseEntity {
  enquiryNumber: string | null;
  userId: string;
  customerName: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  status: EnquiryStatus;
  grandTotal: number | null;
  notes: string | null;
}
