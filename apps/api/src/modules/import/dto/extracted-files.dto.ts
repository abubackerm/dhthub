export interface ExtractedFiles {
  products?: string;
  variants: string;  // Required
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

export const REQUIRED_CSV_FILES = ['variants.csv'];
export const OPTIONAL_CSV_FILES = ['products.csv', 'images.csv', 'attributes.csv', 'attribute-options.csv'];
