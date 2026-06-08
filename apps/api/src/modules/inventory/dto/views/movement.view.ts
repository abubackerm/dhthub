export class MovementView {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  referenceId: string | null;
  createdAt: Date;

  static fromEntity(data: any): MovementView {
    const view = new MovementView();
    view.id = data.id;
    view.type = data.type;
    view.quantity = data.quantity;
    view.reason = data.reason;
    view.referenceId = data.referenceId;
    view.createdAt = data.createdAt;
    return view;
  }
}
