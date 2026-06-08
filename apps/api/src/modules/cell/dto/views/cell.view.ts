import { Cell as CellEntity } from '../../entities/cell.entity';

export interface Cell extends CellEntity {
  productCount?: number;
  attributes?: AttributeView[];
  images?: Array<{
    id: string;
    storagePath: string;
    altText: string | null;
    isPrimary: boolean;
  }>;
}

export interface CellWithCategory extends Cell {
  category: CategoryView;
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
  path: string;
}

export interface AttributeView {
  id: string;
  name: string;
  slug: string;
  dataType: string;
  displayOrder: number;
  isRequired: boolean;
  isFilterable: boolean;
  unit?: string;
  options?: Array<{
    id: string;
    label: string;
    value: string;
  }>;
}

export interface CellListResponse {
  cells: Cell[];
  total: number;
  skip?: number;
  take?: number;
}

export class CellView {
  static fromPrisma(cell: any): Cell {
    const view: Cell = {
      id: cell.id,
      name: cell.name,
      slug: cell.slug,
      sku: cell.sku,
      description: cell.description,
      sortOrder: cell.sortOrder,
      isActive: cell.isActive,
      categoryId: cell.categoryId,
      imageUrl: cell.imageUrl,
      createdAt: cell.createdAt,
      updatedAt: cell.updatedAt,
      createdBy: cell.createdBy,
      updatedBy: cell.updatedBy,
    };

    // Normalize imageUrl if present
    if (view.imageUrl && view.imageUrl.startsWith('http')) {
      const parsed = new URL(view.imageUrl);
      view.imageUrl = parsed.pathname;
    }
    if (view.imageUrl && view.imageUrl.startsWith('/catalog')) {
      view.imageUrl = view.imageUrl.replace('/catalog', '');
    }

    // Add category if present (for CellWithCategory)
    if (cell.category) {
      (view as CellWithCategory).category = cell.category;
    }

    // Map images from storagePath to url with normalization
    view.images = (cell.images || []).map((img: any) => {
      let url = img.storagePath;
      // Normalize URL: strip http(s)://hostname, remove /catalog prefix
      if (url && url.startsWith('http')) {
        const parsed = new URL(url);
        url = parsed.pathname;
      }
      if (url && url.startsWith('/catalog')) {
        url = url.replace('/catalog', '');
      }
      return {
        id: img.id,
        storagePath: url,
        altText: img.altText,
        isPrimary: img.isPrimary,
      };
    });

    // Add attributes if present
    if (cell.cellAttributes) {
      view.attributes = cell.cellAttributes.map((ca: any) => ({
        cellAttributeId: ca.id,
        attributeId: ca.attributeId,
        displayOrder: ca.displayOrder,
        attribute: ca.attribute,
      }));
    }

    // Add productCount if present
    if (cell._count && cell._count.products !== undefined) {
      view.productCount = cell._count.products;
    }

    return view;
  }

  static fromPrismaArray(cells: any[]): Cell[] {
    return cells.map((cell) => CellView.fromPrisma(cell));
  }
}

