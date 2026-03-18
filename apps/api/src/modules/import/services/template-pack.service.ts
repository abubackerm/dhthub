import { Injectable, Logger } from '@nestjs/common';
import AdmZip from 'adm-zip';

@Injectable()
export class TemplatePackService {
  private readonly logger = new Logger(TemplatePackService.name);

  /**
   * Generate ZIP file containing all CSV templates + README
   */
  async generateTemplatePack(): Promise<Buffer> {
    this.logger.log('Generating template pack ZIP');

    const zip = new AdmZip();

    // Add each template file to the ZIP
    zip.addFile('products_template.csv', Buffer.from(this.generateProductsTemplate()));
    zip.addFile('variants_template.csv', Buffer.from(this.generateVariantsTemplate()));
    zip.addFile('images_template.csv', Buffer.from(this.generateImagesTemplate()));
    zip.addFile('attributes_template.csv', Buffer.from(this.generateAttributesTemplate()));
    zip.addFile('attribute-options_template.csv', Buffer.from(this.generateAttributeOptionsTemplate()));
    zip.addFile('README.txt', Buffer.from(this.generateReadme()));

    return zip.toBuffer();
  }

  /**
   * Generate products.csv template
   */
  private generateProductsTemplate(): string {
    const headers = ['product_slug', 'product_name', 'cell_slug', 'description'];
    const exampleRows = [
      'wedge-anchor,Wedge Anchor,wedge-anchors,Steel wedge anchors for concrete fastening',
      'hex-bolt,Hex Head Bolt,hex-bolts,Standard hex bolts for general purpose',
    ];

    return [headers.join(','), ...exampleRows].join('\n');
  }

  /**
   * Generate variants.csv template
   */
  private generateVariantsTemplate(): string {
    const headers = ['product_slug', 'sku', 'price', 'stock', 'diameter', 'length', 'material', 'finish'];
    const exampleRows = [
      'wedge-anchor,91578A103,0.71,500,1/4,1.75,Steel,Zinc',
      'wedge-anchor,91578A104,0.75,500,1/4,2.25,Steel,Zinc',
      'hex-bolt,HB-M8-20,0.50,1000,8,20,Steel,Zinc',
      'hex-bolt,HB-M8-25,0.55,1000,8,25,Steel,Zinc',
      'hex-bolt,HB-M10-30,0.75,500,10,30,Steel,Zinc',
    ];

    return [headers.join(','), ...exampleRows].join('\n');
  }

  /**
   * Generate images.csv template
   */
  private generateImagesTemplate(): string {
    const headers = ['sku', 'image_url'];
    const exampleRows = [
      '91578A103,https://cdn.example.com/images/91578A103.jpg',
      '91578A104,https://cdn.example.com/images/91578A104.jpg',
      'HB-M8-20,https://cdn.example.com/images/HB-M8-20.jpg',
    ];

    return [headers.join(','), ...exampleRows].join('\n');
  }

  /**
   * Generate attributes.csv template
   */
  private generateAttributesTemplate(): string {
    const headers = ['name', 'slug', 'dataType', 'group', 'sortOrder', 'isFilterable', 'filterType', 'unitSymbol'];
    const exampleRows = [
      'Thread Size,thread-size,enum,Technical Specs,1,true,CHECKBOX,',
      'Material,material,enum,Material,2,true,CHECKBOX,',
      'Diameter,diameter,number,Dimensions,3,true,RANGE,mm',
      'Length,length,number,Dimensions,4,true,RANGE,mm',
      'Finish,finish,enum,Material,5,true,CHECKBOX,',
    ];

    return [headers.join(','), ...exampleRows].join('\n');
  }

  /**
   * Generate attribute-options.csv template
   */
  private generateAttributeOptionsTemplate(): string {
    const headers = ['attributeSlug', 'label', 'value', 'sortOrder'];
    const exampleRows = [
      'material,Steel,steel,1',
      'material,Stainless Steel,stainless-steel,2',
      'material,Aluminum,aluminum,3',
      'material,Brass,brass,4',
      'finish,Zinc,zinc,1',
      'finish,Black Oxide,black-oxide,2',
      'finish,Plain,plain,3',
      'thread-size,1/4-20,1/4-20,1',
      'thread-size,3/8-16,3/8-16,2',
      'thread-size,1/2-13,1/2-13,3',
    ];

    return [headers.join(','), ...exampleRows].join('\n');
  }

  /**
   * Generate README.txt with usage instructions
   */
  private generateReadme(): string {
    return `Catalog Import Templates
========================

This ZIP file contains CSV templates for importing large industrial catalogs (500k+ variants).

FILES
------
1. products_template.csv     - Product family definitions
2. variants_template.csv     - SKU/product variant details (required)
3. images_template.csv       - Product variant images
4. attributes_template.csv   - Attribute metadata (optional)
5. attribute-options_template.csv - Attribute enum values (optional)

USAGE
-----

1. Prepare your data:
   - Download these templates
   - Fill in your product data (variants.csv is required)
   - Optional: provide attributes.csv to define attribute metadata
   - Optional: provide attribute-options.csv for enum attributes
   - Optional: provide images.csv with image URLs (will be downloaded and stored)

2. Create a ZIP archive:
   - Name it: catalog-import.zip
   - Include your CSV files (must match template filenames exactly)
   - Required files: variants.csv
   - Optional files: products.csv, images.csv, attributes.csv, attribute-options.csv

3. Upload via API:
   - POST /v1/import/jobs
   - Content-Type: multipart/form-data
   - File field: file
   - Accepts: .zip (multi-CSV) or .csv (single file)

TEMPLATE DETAILS
---------------

products.csv
------------
Defines product families (groups of variants).
Each row is a product family.

Required columns:
- product_slug: Unique identifier (e.g., wedge-anchor)
- product_name: Display name
- cell_slug: Cell slug where products should appear (e.g., wedge-anchors, hex-bolts)
  - Cell must exist in database or will be created if category exists
  - Use existing cell slug to avoid duplicate products
- description: Product description

Example:
product_slug,product_name,cell_slug,description
wedge-anchor,Wedge Anchor,wedge-anchors,Steel wedge anchors for concrete fastening

variants.csv
-----------
Defines individual SKUs.
Each row is a product variant.

Required columns:
- product_slug: References product_slug from products.csv
- sku: Unique SKU identifier
- price: Unit price (numeric)
- stock: Stock quantity (integer)

Dynamic columns (optional):
- All other columns are treated as attributes
- Example: diameter, length, material, finish
- System fields: product_slug, sku, price, stock

Example:
product_slug,sku,price,stock,diameter,length,material,finish
wedge-anchor,91578A103,0.71,500,1/4,1.75,Steel,Zinc

images.csv
----------
Associates images with SKUs.

Required columns:
- sku: References SKU from variants.csv
- image_url: Public URL (will be downloaded and stored in object storage)

Example:
sku,image_url
91578A103,https://cdn.example.com/images/91578A103.jpg

attributes.csv
--------------
Defines attribute metadata.
If not provided, attributes will be auto-created from variants.csv columns.

Required columns:
- name: Display name
- slug: Unique identifier (lowercase alphanumeric with hyphens)
- dataType: Data type (number, text, enum, boolean)
- group: Attribute group (e.g., Material, Dimensions, Technical Specs)
- sortOrder: Sort order (integer, 0-indexed)
- isFilterable: Whether attribute can be used for filtering (true/false)
- filterType: Filter type (RANGE for numbers, CHECKBOX/SELECT for enums)
- unitSymbol: Unit symbol (only for number types, e.g., mm, in)

Data type restrictions:
- number: Only RANGE filter type allowed
- enum: CHECKBOX or SELECT filter type allowed
- boolean: No filter type allowed (simple toggle)
- text: No filter type allowed

Example:
name,slug,dataType,group,sortOrder,isFilterable,filterType,unitSymbol
Thread Size,thread-size,enum,Technical Specs,1,true,CHECKBOX,
Material,material,enum,Material,2,true,CHECKBOX,
Diameter,diameter,number,Dimensions,3,true,RANGE,mm
Length,length,number,Dimensions,4,true,RANGE,mm

attribute-options.csv
-------------------
Defines enum values for enum-type attributes.

Required columns:
- attributeSlug: References slug from attributes.csv
- label: Display label for the option
- value: Internal value (lowercase alphanumeric with hyphens)
- sortOrder: Sort order (integer, 0-indexed)

Example:
attributeSlug,label,value,sortOrder
material,Steel,steel,1
material,Stainless Steel,stainless-steel,2
finish,Zinc,zinc,1
thread-size,1/4-20,1/4-20,1

VALIDATION RULES
----------------

1. variants.csv:
   - sku must be unique
   - product_slug must exist in products.csv (if provided)
   - price and stock must be numeric

2. products.csv:
   - product_slug must be unique
   - cell_slug must reference an existing cell or will be created if category exists

3. images.csv:
   - sku must exist in variants.csv
   - image_url must be a valid URL

4. attributes.csv:
   - slug must be unique
   - dataType must be: number, text, enum, or boolean
   - isFilterable and filterType must be consistent (filterType requires isFilterable)
   - number type: only RANGE filter allowed
   - enum type: CHECKBOX or SELECT filter allowed
   - boolean type: no filter allowed
   - text type: no filter allowed
   - unitSymbol only for number types

5. attribute-options.csv:
   - attributeSlug must exist in attributes.csv (matches slug column)
   - value must be unique per attribute

IMPORT WORKFLOW
----------------

When you upload a ZIP:

1. Extract archive
2. Validate required files (variants.csv required)
3. Create ImportJob
4. Queue worker for async processing

Worker pipeline:
Step 1 - Import products
Step 2 - Import attributes (or auto-create from variants)
Step 3 - Import variants (in batches of 500)
Step 4 - Import images (download from URLs)
Step 5 - Update search index

ERRORS
-------

Row-level errors are recorded and can be retrieved via:
GET /v1/import/jobs/:id/errors

Each error includes:
- row number
- SKU (if applicable)
- error message
- raw data from the row
- source file name

PERFORMANCE
-----------

Designed for large-scale catalogs:
- 500k products
- 1M+ variants

Optimizations:
- Stream CSV files (never load entire file into memory)
- Process variants in batches of 500
- Use database transactions
- Parallel image downloads
- Record errors without failing entire import

SUPPORT
-------

For issues or questions, contact your system administrator.
`;
  }
}
