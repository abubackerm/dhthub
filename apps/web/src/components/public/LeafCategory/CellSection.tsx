import Link from "next/link";
import type {
  LeafCellView,
  LeafFilterableAttributeView,
  LeafAttributeValueView,
} from "@/lib/api/catalog/types";
import { CellProductTable } from "./CellProductTable";

interface CellSectionProps {
  cell: LeafCellView;
  basePath: string;
  filterableAttributes: LeafFilterableAttributeView[];
}

export function CellSection({
  cell,
  basePath,
  filterableAttributes,
}: CellSectionProps) {
  const variantCount = cell.products.reduce((sum, p) => sum + p.variants.length, 0);
  const hasProducts = cell.products.length > 0;
  
  if (variantCount === 0 && !hasProducts) return null;

  return (
    <div className="cell-section">
      {/* h2: Cell name */}
      <h2 className="text-xl font-semibold text-foreground mb-4">{cell.name}</h2>
      {cell.description && (
        <p className="text-sm text-muted-foreground mb-4">{cell.description}</p>
      )}

      {/* Products under this cell */}
      {cell.products.map((product) => (
        <ProductSection
          key={product.id}
          product={product}
          filterableAttributes={filterableAttributes}
          basePath={basePath}
        />
      ))}
    </div>
  );
}

function ProductSection({
  product,
  filterableAttributes,
  basePath,
}: {
  product: LeafCellView["products"][0];
  filterableAttributes: LeafFilterableAttributeView[];
  basePath: string;
}) {
  if (product.variants.length === 0) {
    return (
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground mb-2">
          <Link
            href={`${basePath}/${product.slug}`}
            className="hover:text-(--dht-red) transition-colors"
          >
            {product.name}
          </Link>
        </h2>
        {product.description && (
          <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* h2: Product name */}
      <h2 className="text-lg font-medium text-foreground mb-2">
        <Link
          href={`${basePath}/${product.slug}`}
          className="hover:text-(--dht-red) transition-colors"
        >
          {product.name}
        </Link>
      </h2>
      {product.description && (
        <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
      )}

      <CellProductTable
        products={[product]}
        filterableAttributes={filterableAttributes}
        basePath={basePath}
      />
    </div>
  );
}

function getAttributeValue(
  attributeValues: LeafAttributeValueView[],
  attributeId: string
): string | number | boolean | null {
  const av = attributeValues.find((v) => v.attributeId === attributeId);
  if (!av) return null;

  switch (av.dataType) {
    case "number":
      return av.numberValue;
    case "text":
      return av.textValue;
    case "enum":
      return av.optionValue;
    case "boolean":
      return av.booleanValue;
    default:
      return null;
  }
}
