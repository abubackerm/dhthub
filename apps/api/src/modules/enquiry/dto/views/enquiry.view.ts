import { EnquiryEntity, EnquiryStatus } from '../../entities';
import { EnquiryItemView } from './enquiry-item.view';

export class EnquiryView {
  id: string;
  enquiryNumber: string | null;
  userId: string;
  customerName: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  status: EnquiryStatus;
  grandTotal: number | null;
  items: EnquiryItemView[];
  itemCount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: EnquiryEntity, items: EnquiryItemView[] = []): EnquiryView {
    const view = new EnquiryView();
    view.id = entity.id;
    view.enquiryNumber = entity.enquiryNumber;
    view.userId = entity.userId;
    view.customerName = entity.customerName;
    view.companyName = entity.companyName;
    view.email = entity.email;
    view.phone = entity.phone;
    view.status = entity.status;
    view.grandTotal = entity.grandTotal;
    view.items = items;
    view.itemCount = items.length;
    view.notes = entity.notes;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }
}
