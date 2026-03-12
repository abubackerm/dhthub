export class WarehouseView {
  id: string;
  name: string;
  code: string;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(data: any): WarehouseView {
    const view = new WarehouseView();
    view.id = data.id;
    view.name = data.name;
    view.code = data.code;
    view.location = data.location;
    view.createdAt = data.createdAt;
    view.updatedAt = data.updatedAt;
    return view;
  }
}
