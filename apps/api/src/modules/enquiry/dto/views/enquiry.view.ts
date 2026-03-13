import { EnquiryEntity, EnquiryStatus } from '../../entities';
import { EnquiryItemView } from './enquiry-item.view';

export class EnquiryView {
  id: string;
  userId: string;
  status: EnquiryStatus;
  items: EnquiryItemView[];
  itemCount: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: EnquiryEntity, items: EnquiryItemView[] = []): EnquiryView {
    const view = new EnquiryView();
    view.id = entity.id;
    view.userId = entity.userId;
    view.status = entity.status;
    view.items = items;
    view.itemCount = items.length;
    view.notes = entity.notes;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }
}
