We need to implement a **SKU-based image import pipeline and SeaweedFS storage structure** for the catalog system.

The platform stack:

NestJS
Prisma
PostgreSQL
BullMQ
SeaweedFS (S3 gateway)
Meilisearch

The catalog contains **variants identified by SKU**, and each variant can have **multiple images**.

Images will be uploaded in bulk (usually ZIP files) and the system must automatically detect the SKU from the filename and store the image in SeaweedFS using a structured path.

---

GOAL

Implement a **fully automated image ingestion pipeline** where:

Users upload images without any folders.

Example uploaded files:

91578A103-1.jpg
91578A103-2.jpg
91578A103-3.jpg

The system automatically:

1. extracts SKU and position
2. generates storage path
3. uploads image to SeaweedFS
4. stores metadata in database

---

IMAGE NAMING CONVENTION

All catalog images follow this naming pattern:

SKU-POSITION.ext

Examples:

91578A103-1.jpg
91578A103-2.jpg
91578A103-3.jpg

Rules:

SKU = variant SKU
POSITION = image order (1 = primary image)

---

STORAGE STRUCTURE

Images must be stored in SeaweedFS using a **SKU prefix sharding system** to avoid millions of files in one folder.

Path format:

/product-images/{prefix}/{sku}-{position}.jpg

Prefix is the **first 3 characters of the SKU**.

Example:

SKU: 91578A103

Images stored as:

/product-images/915/91578A103-1.jpg
/product-images/915/91578A103-2.jpg
/product-images/915/91578A103-3.jpg

Users never create folders manually. The system generates them automatically.

---

DATABASE TABLE

Create table:

VariantImage

fields:

id
variantId
storagePath
position
createdAt

Example record:

variantId: 1234
storagePath: /product-images/915/91578A103-1.jpg
position: 1

---

IMPORT WORKFLOW

Admin uploads images.zip.

Pipeline:

1. extract ZIP
2. iterate image files
3. parse filename

Example:

91578A103-2.jpg

Extract:

sku = 91578A103
position = 2

4. lookup variant by sku
5. generate prefix

Example:

prefix = sku.substring(0,3)

6. generate storage path

/product-images/{prefix}/{filename}

7. upload file to SeaweedFS

8. create VariantImage record

---

SEAWEEDFS CONFIGURATION

We are using SeaweedFS S3 gateway.

Bucket name:

catalog

Final object keys should look like:

catalog/product-images/915/91578A103-1.jpg

Implementation requirements:

• configure SeaweedFS S3 client
• upload files using streaming
• avoid loading entire files into memory
• support large batch uploads

---

IMAGE PROCESSING

Image uploads should not block imports.

Use BullMQ worker:

Queue name:

image-processing

Worker responsibilities:

• upload image to SeaweedFS
• generate thumbnails (future)
• create database record

---

THUMBNAIL SUPPORT (PREPARE STRUCTURE)

Images should be stored in a structure compatible with future thumbnails.

Example:

/product-images/915/91578A103-1.jpg
/product-images/915/91578A103-1-thumb.jpg

Do not generate thumbnails yet, but design path structure to support it.

---

ERROR HANDLING

If filename does not match expected pattern:

SKU-POSITION.ext

Log row error:

InvalidImageFilenameError

If SKU does not exist:

log error and skip file.

---

API ENDPOINT

Create endpoint:

POST /catalog/import/images

Request:

multipart upload

or

ZIP upload

System processes images asynchronously via queue.

---

PERFORMANCE REQUIREMENTS

System must support:

• 500k+ images
• batch ZIP uploads
• concurrent workers
• streaming uploads

---

OBJECTIVE

Implement a **fully automated SKU-based image ingestion system with SeaweedFS storage**, using prefix-based sharding and asynchronous workers so the platform can handle large industrial catalogs efficiently.
