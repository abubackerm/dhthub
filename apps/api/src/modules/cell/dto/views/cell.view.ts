import { Cell as CellEntity } from '../../entities/cell.entity';

export interface Cell extends CellEntity {
  productCount?: number;
  attributes?: AttributeView[];
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
