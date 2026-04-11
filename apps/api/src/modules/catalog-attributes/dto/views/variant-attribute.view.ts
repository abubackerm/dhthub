import { VariantAttributeValueEntity } from '../../entities';

export class VariantAttributeView {
  id: string;
  variantId: string;
  attributeId: string;
  name: string;
  slug: string;
  dataType: 'number' | 'text' | 'enum' | 'boolean';
  value: string | number | boolean | null;
  unit: string | null;
  createdAt: Date;

  static fromEntity(entity: VariantAttributeValueEntity & { attribute: any; option?: any }): VariantAttributeView {
    const view = new VariantAttributeView();
    view.id = entity.id;
    view.variantId = entity.variantId;
    view.attributeId = entity.attributeId;
    view.name = entity.attribute?.name ?? '';
    view.slug = entity.attribute?.slug ?? '';
    view.dataType = entity.attribute?.dataType as 'number' | 'text' | 'enum' | 'boolean';
    view.unit = null;
    view.createdAt = entity.createdAt;

    switch (view.dataType) {
      case 'number':
        view.value = entity.numberValue;
        break;
      case 'text':
        view.value = entity.textValue;
        break;
      case 'enum':
        view.value = entity.option?.label ?? null;
        break;
      case 'boolean':
        view.value = entity.booleanValue ?? false;
        break;
    }

    return view;
  }

  static fromEntities(entities: (VariantAttributeValueEntity & { attribute: any; option?: any })[]): VariantAttributeView[] {
    return entities.map((entity) => VariantAttributeView.fromEntity(entity));
  }
}

