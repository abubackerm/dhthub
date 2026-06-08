export interface ExtractedFiles {
  products?: string;
  variants?: string;  // Required for catalog imports, optional for attribute imports
  images?: string;
  attributes?: string;
  attributeOptions?: string;
}

export interface ZipValidationResult {
  isValid: boolean;
  errors: string[];
  requiredFiles: string[];
  optionalFiles: string[];
}

export const CATALOG_REQUIRED_CSV_FILES = ['variants.csv'];
export const ATTRIBUTE_REQUIRED_CSV_FILES = ['attributes.csv'];
export const OPTIONAL_CSV_FILES = ['products.csv', 'images.csv', 'attribute-options.csv'];

export interface ExtractedFileInfo {
  fileName: string;
  url: string;
  storageKey: string;
}
