# McMaster Admin — UI Build Blueprint
> This file focuses ONLY on adding new sections to the existing ShadcnStore admin dashboard.
> Do NOT rename or delete any existing pages. Only ADD new ones.
> Phase 1 = UI and mock data only. No real API calls, no database, no Prisma.
> Phase 2 = Backend, API routes, Prisma schema (separate file).

---

## HOW TO USE WITH CURSOR
- Tell Cursor: *"I have an existing ShadcnStore Shadcn admin dashboard. Do not touch any existing pages or sidebar items. Only add the new sections described in Phase 1."*
- Use mock/hardcoded data for everything in Phase 1 — no API calls yet
- Every list, table, form should work visually with fake data
- Mark tasks `[x]` as completed

---

## MOCK DATA STRATEGY
Before building any UI, create one file that holds all fake data:

- [ ] Create `lib/mock-data.ts`
- [ ] This file exports mock arrays for: categories, products, upload batches, review queue items, users
- [ ] Every UI component in Phase 1 imports from this file instead of an API
- [ ] Sample mock structure:

```ts
// lib/mock-data.ts

export const mockCategories = [
  {
    id: "1",
    name: "Fasteners",
    slug: "fasteners",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 3,
    isActive: true,
    children: [
      {
        id: "2",
        name: "Bolts",
        slug: "bolts",
        type: "BRANCH",
        depth: 1,
        parentId: "1",
        productCount: 0,
        childCount: 2,
        isActive: true,
        children: [
          {
            id: "3",
            name: "Stainless Steel Hex Bolts",
            slug: "stainless-steel-hex-bolts",
            type: "LEAF",
            depth: 2,
            parentId: "2",
            productCount: 142,
            childCount: 0,
            isActive: true,
            children: []
          },
          {
            id: "4",
            name: "Grade 8 Hex Bolts",
            slug: "grade-8-hex-bolts",
            type: "LEAF",
            depth: 2,
            parentId: "2",
            productCount: 89,
            childCount: 0,
            isActive: true,
            children: []
          }
        ]
      }
    ]
  },
  {
    id: "5",
    name: "Tubing",
    slug: "tubing",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 2,
    isActive: true,
    children: []
  }
]

export const mockAttributes = [
  {
    id: "a1",
    categoryId: "3",
    name: "Thread Size",
    slug: "thread_size",
    dataType: "SELECT",
    filterType: "CHECKBOX_LIST",
    unit: null,
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 1,
    allowedValues: ["1/4-20", "5/16-18", "3/8-16", "1/2-13"]
  },
  {
    id: "a2",
    categoryId: "3",
    name: "Length",
    slug: "length",
    dataType: "NUMBER",
    filterType: "RANGE",
    unit: "in",
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 2,
    allowedValues: []
  },
  {
    id: "a3",
    categoryId: "3",
    name: "Material",
    slug: "material",
    dataType: "SELECT",
    filterType: "CHECKBOX_LIST",
    unit: null,
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 3,
    allowedValues: ["316 Stainless Steel", "18-8 Stainless Steel", "304 Stainless Steel"]
  },
  {
    id: "a4",
    categoryId: "3",
    name: "Finish",
    slug: "finish",
    dataType: "SELECT",
    filterType: "CHECKBOX_LIST",
    unit: null,
    isRequired: false,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 4,
    allowedValues: ["Plain", "Passivated", "Black Oxide"]
  }
]

export const mockProducts = [
  {
    id: "p1",
    sku: "91257A123",
    name: "Hex Head Screw 1/4-20 x 1in Stainless",
    categoryId: "3",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    status: "PUBLISHED",
    basePrice: 0.45,
    inStock: true,
    uploadedBy: "Sarah K.",
    createdAt: "2024-01-15",
    attributes: {
      thread_size: "1/4-20",
      length: "1",
      material: "18-8 Stainless Steel",
      finish: "Plain"
    }
  },
  {
    id: "p2",
    sku: "91257A124",
    name: "Hex Head Screw 1/4-20 x 1.5in Stainless",
    categoryId: "3",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    status: "IN_REVIEW",
    basePrice: 0.52,
    inStock: true,
    uploadedBy: "Sarah K.",
    createdAt: "2024-01-16",
    attributes: {
      thread_size: "1/4-20",
      length: "1.5",
      material: "18-8 Stainless Steel",
      finish: "Plain"
    }
  },
  {
    id: "p3",
    sku: "91257A125",
    name: "Hex Head Screw 5/16-18 x 2in Stainless",
    categoryId: "3",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    status: "DRAFT",
    basePrice: 0.78,
    inStock: false,
    uploadedBy: "James T.",
    createdAt: "2024-01-17",
    attributes: {
      thread_size: "5/16-18",
      length: "2",
      material: "316 Stainless Steel",
      finish: "Passivated"
    }
  },
  {
    id: "p4",
    sku: "91257A126",
    name: "Hex Head Screw 3/8-16 x 2.5in Stainless",
    categoryId: "3",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    status: "REJECTED",
    basePrice: 1.12,
    inStock: true,
    uploadedBy: "James T.",
    createdAt: "2024-01-18",
    attributes: {
      thread_size: "3/8-16",
      length: "2.5",
      material: "316 Stainless Steel",
      finish: "Black Oxide"
    }
  }
]

export const mockUploadBatches = [
  {
    id: "b1",
    categoryName: "Stainless Steel Hex Bolts",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    uploadedBy: "Sarah K.",
    originalFilename: "hex_bolts_jan_batch1.csv",
    status: "COMPLETED",
    totalRows: 200,
    validRows: 200,
    errorRows: 0,
    createdAt: "2024-01-15 09:32 AM",
    completedAt: "2024-01-15 09:33 AM"
  },
  {
    id: "b2",
    categoryName: "Grade 8 Hex Bolts",
    categoryPath: "Fasteners > Bolts > Grade 8 Hex Bolts",
    uploadedBy: "James T.",
    originalFilename: "grade8_upload.csv",
    status: "COMPLETED_WITH_ERRORS",
    totalRows: 150,
    validRows: 132,
    errorRows: 18,
    createdAt: "2024-01-16 02:15 PM",
    completedAt: "2024-01-16 02:16 PM"
  },
  {
    id: "b3",
    categoryName: "Stainless Steel Hex Bolts",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    uploadedBy: "Sarah K.",
    originalFilename: "hex_bolts_jan_batch2.csv",
    status: "VALIDATING",
    totalRows: 300,
    validRows: 0,
    errorRows: 0,
    createdAt: "2024-01-17 11:00 AM",
    completedAt: null
  }
]

export const mockReviewQueue = [
  {
    id: "r1",
    sku: "91257A124",
    name: "Hex Head Screw 1/4-20 x 1.5in Stainless",
    categoryPath: "Fasteners > Bolts > Stainless Steel Hex Bolts",
    uploadedBy: "Sarah K.",
    submittedAt: "2024-01-16 10:00 AM",
    batchId: "b1",
    attributes: {
      thread_size: "1/4-20",
      length: "1.5",
      material: "18-8 Stainless Steel",
      finish: "Plain"
    },
    price: 0.52
  }
]

export const mockUsers = [
  { id: "u1", name: "Admin User", email: "admin@company.com", role: "SUPER_ADMIN", isActive: true, joinedAt: "2023-12-01" },
  { id: "u2", name: "Sarah K.", email: "sarah@company.com", role: "DATA_ENTRY", isActive: true, joinedAt: "2024-01-01" },
  { id: "u3", name: "James T.", email: "james@company.com", role: "DATA_ENTRY", isActive: true, joinedAt: "2024-01-05" },
  { id: "u4", name: "Reviewer One", email: "review@company.com", role: "REVIEWER", isActive: true, joinedAt: "2023-12-15" },
  { id: "u5", name: "Cat Admin", email: "catadmin@company.com", role: "CATEGORY_ADMIN", isActive: false, joinedAt: "2023-11-01" }
]
```

---

# PHASE 1 — UI Only (Mock Data, No Backend)

---

## STEP 1 — Add New Sidebar Sections

- [ ] Open the existing sidebar component file (do not rewrite it, only add to it)
- [ ] Add the following new sections BELOW the existing sidebar items:

```
─── Catalog Setup ───
  📁 Categories
  🔧 Attributes

─── Products ───
  📦 All Products
  ⬆️  Upload
  🕓 Upload History

─── Review ───
  ✅ Review Queue        [badge: count]
  🔁 Schema Requests     [badge: count]


```

- [ ] Each sidebar item links to its own page route under `/dhthub-admin/`
- [ ] Review Queue and Schema Requests sidebar items show a small red count badge (hardcode the number for now: Review Queue = 1, Schema Requests = 2)
- [ ] Active page highlights in sidebar same style as existing items

---

## STEP 2 — Categories Page

**Route:** `/dhthub-admin/categories`

### Layout
- [ ] Page title: "Categories" with a subtitle: "Build your catalog structure. Branches group items, Leaves hold products."
- [ ] Top right: single button — **"+ Add Category"** (opens a slide-over panel, see Step 2B)

### Category Tree Display
- [ ] Render the tree from `mockCategories` as a vertically nested, indented list
- [ ] Each level is indented by 24px more than its parent
- [ ] Connecting lines (thin gray vertical + horizontal lines) between parent and children like a file explorer
- [ ] Each category row contains (left to right):
  - Expand/collapse arrow (if it has children) — clicking toggles children visibility
  - Folder icon (for BRANCH) or Tag icon (for LEAF)
  - Category name (bold for depth 0, normal for deeper)
  - Type badge: pill shape — "BRANCH" in gray, "LEAF" in blue
  - If LEAF: small text showing product count e.g. "142 products"
  - If BRANCH: small text showing child count e.g. "3 subcategories"
  - Status dot: green = active, gray = inactive
  - Right side action buttons (appear on row hover): **Edit** | **Add Child** | **Manage Schema** (Manage Schema only shows if type = LEAF)
- [ ] All branches start expanded by default
- [ ] Clicking the category name does nothing in Phase 1 (will navigate later)

### Step 2B — Add Category Slide-Over Panel
- [ ] Clicking "+ Add Category" opens a right-side slide-over (not a modal)
- [ ] Panel title: "Add Category"
- [ ] Fields:
  - **Name** (text input, required)
  - **Slug** (text input, auto-populates from name as user types, e.g. "Hex Bolts" → "hex-bolts", user can override)
  - **Parent Category** (searchable dropdown — lists all existing categories, option for "None — top level")
  - **Type** (segmented control with two options: BRANCH | LEAF)
  - When LEAF is selected, show an info box: "This category will hold products. You'll need to set up its attribute schema before uploading products."
  - **Description** (textarea, optional)
  - **Sort Order** (number input, optional)
- [ ] Bottom of panel: **Cancel** button and **Save Category** button
- [ ] On Save (mock): add the new category to the displayed tree visually, close the panel, show a toast notification "Category created successfully"
- [ ] Edit button on a row opens the same slide-over pre-filled with that category's data

---

## STEP 3 — Attributes Page

**Route:** `/dhthub-admin/attributes`

### Layout
- [ ] Page title: "Attributes" with subtitle: "Manage attribute schemas for each leaf category."
- [ ] Left column (1/3 width): list of all LEAF categories
- [ ] Right column (2/3 width): attribute schema for the selected leaf category

### Left Column — Leaf Category List
- [ ] List only LEAF type categories from `mockCategories`
- [ ] Each item shows: category name, breadcrumb path underneath in small gray text (e.g. "Fasteners › Bolts"), product count
- [ ] Clicking selects it and highlights it — right column updates to show that category's attributes
- [ ] First item is selected by default on page load

### Right Column — Attribute Schema Table
- [ ] Header shows selected category name + full breadcrumb path
- [ ] Top right button: **"+ Add Attribute"** (opens slide-over, see Step 3B)
- [ ] Table with columns: **Drag** (handle icon) | **Order** | **Name** | **Slug** | **Type** | **Unit** | **Filter** | **Required** | **In Table** | **Actions**
- [ ] Each row is one attribute from `mockAttributes` for the selected category
- [ ] Type column shows a colored badge: NUMBER = purple, SELECT = blue, MULTI_SELECT = teal, BOOLEAN = orange, TEXT = gray
- [ ] Required column: green checkmark if true, dash if false
- [ ] In Table column: eye icon if true, eye-off icon if false — clicking toggles it (mock)
- [ ] Actions column: **Edit** icon button | **Delete** icon button
- [ ] Rows are draggable to reorder (visual only in Phase 1 — drag and drop updates the order visually)
- [ ] If no attributes exist for selected category, show empty state: "No attributes yet. Add your first attribute to define what columns products in this category will have."

### Step 3B — Add/Edit Attribute Slide-Over
- [ ] Panel title: "Add Attribute" or "Edit Attribute"
- [ ] Fields (in this order):
  - **Attribute Name** (text, required) — e.g. "Thread Size"
  - **Slug** (text, auto-generated from name, shown in gray monospace font) — e.g. "thread_size"
  - **Help Text** (textarea, optional) — shown to data entry people during upload e.g. "Enter the thread standard e.g. 1/4-20"
  - **Data Type** (segmented control or select): NUMBER | SELECT | MULTI_SELECT | BOOLEAN | TEXT
  - **Unit** (text input) — only visible when Data Type = NUMBER. Label: "Unit (e.g. in, mm, PSI)"
  - **Filter Display** (select dropdown): Range Slider | Checkbox List | Toggle | Not Filterable — auto-sets based on Data Type but user can override
  - **Required** (toggle switch)
  - **Show in Product Table** (toggle switch)
  - **Show in Product Spec Sheet** (toggle switch)
  - --- separator line ---
  - **Allowed Values** section — only visible when Data Type = SELECT or MULTI_SELECT
    - Label: "Allowed Values" with subtitle "Define the exact values data entry people can choose from"
    - List of existing values with a drag handle and a delete (×) button per value
    - Input at bottom + "Add Value" button to add new ones
    - Values can be reordered by drag
- [ ] Cancel and Save buttons at bottom
- [ ] On Save (mock): adds row to the attribute table, shows toast "Attribute saved"

---

## STEP 4 — All Products Page

**Route:** `/dhthub-admin/products`

### Layout
- [ ] Page title: "Products"
- [ ] Top bar with:
  - Search input (placeholder: "Search by SKU or name...")
  - Status filter tabs: **All** | **Draft** | **In Review** | **Published** | **Rejected** | **Archived**
  - Category filter dropdown (searchable, lists all LEAF categories)
  - Right side: **"+ Add Product"** button (opens slide-over, Step 4C) and **"Bulk Upload"** button (navigates to `/dhthub-admin/upload`)

### Products Table
- [ ] Table columns: **SKU** | **Name** | **Category** | **Price** | **Stock** | **Status** | **Uploaded By** | **Date** | **Actions**
- [ ] Render rows from `mockProducts`
- [ ] SKU column: monospace font, slightly smaller
- [ ] Category column: show full path in small gray text
- [ ] Price: formatted as "$0.45"
- [ ] Stock: green "In Stock" or red "Out of Stock" pill
- [ ] Status column: colored badge
  - DRAFT = gray
  - IN_REVIEW = yellow/amber
  - PUBLISHED = green
  - REJECTED = red
  - ARCHIVED = gray with strikethrough style
- [ ] Actions column (icon buttons on hover): **View** | **Edit** | **Delete**
- [ ] Clicking a row opens the product detail slide-over (Step 4B)
- [ ] Status filter tabs update which rows show (mock filtering in React state)
- [ ] Searching filters rows by SKU or name (mock filter in React state)

### Step 4B — Product Detail Slide-Over (View/Edit)
- [ ] Opens from the right, wider than the add category panel (use 600px width)
- [ ] Top of panel:
  - SKU in monospace large text
  - Product name below it
  - Status badge
  - Breadcrumb category path
- [ ] Two sections:
  - **Core Info**: Name, SKU, Price, In Stock toggle, Stock Qty, Min Order Qty, Lead Time
  - **Attributes**: renders each attribute for this product's category as a labeled row — "Thread Size: 1/4-20", "Length: 1 in", etc.
- [ ] If status = DRAFT, show a blue button "Submit for Review"
- [ ] If status = REJECTED, show a red banner at top with the rejection reason (hardcode: "Incorrect material value — use the allowed values list") and a button "Edit & Resubmit"
- [ ] Edit mode: clicking Edit icon turns the fields into inputs
- [ ] Image section: show placeholder image boxes (no real upload in Phase 1)

### Step 4C — Add Single Product Slide-Over
- [ ] Step 1 — Category selection:
  - Searchable dropdown of LEAF categories only
  - Shows category breadcrumb path below selection
  - "Next" button proceeds to Step 2
- [ ] Step 2 — Product form (dynamically rendered based on selected category):
  - Fixed fields first: **SKU** (text, required), **Name** (text, required), **Base Price** (number, required), **In Stock** (toggle), **Stock Qty** (number), **Min Order Qty** (number, default 1), **Lead Time Days** (number)
  - Divider: "--- Product Attributes ---"
  - For each attribute in the selected category's schema (from `mockAttributes`):
    - Render the correct input type:
      - NUMBER → number input with unit label on the right (e.g. "in")
      - SELECT → dropdown showing allowed values
      - MULTI_SELECT → multi-select checkboxes or tag input
      - BOOLEAN → toggle switch
      - TEXT → text input
    - Required attributes show a red asterisk after the label
    - Help text shows below the input in small gray text
- [ ] Save as Draft button at bottom
- [ ] On save (mock): adds to product list, shows toast "Product saved as draft"

---

## STEP 5 — Upload Page

**Route:** `/dhthub-admin/upload`

### Layout
- [ ] Page title: "Upload Products"
- [ ] Subtitle: "Bulk upload products into a leaf category using a CSV file"
- [ ] Single-page flow with 3 clear visual steps shown as a step indicator at the top: **1. Select Category** → **2. Upload File** → **3. Review Results**

### Step 1 — Select Category
- [ ] A card/panel with label "Select a Leaf Category"
- [ ] Searchable dropdown showing only LEAF categories with their full path
- [ ] On selection, show below:
  - Category full path as breadcrumb
  - Number of existing products in that category
  - List of attributes with required/optional tags — shows the user what columns the CSV needs
  - A "Download CSV Template" button (mock — shows a toast "Template downloaded" in Phase 1)
- [ ] "Continue" button activates only after a category is selected

### Step 2 — Upload File
- [ ] Large drag-and-drop zone: dashed border, upload icon, text "Drag your CSV or Excel file here, or click to browse"
- [ ] Accepted formats note: ".csv or .xlsx only"
- [ ] After a file is selected (mock — just detect file selection):
  - Show file name, file size, and a green checkmark
  - Show "Detected 150 rows" (hardcode this number for mock)
  - Show a data preview table: first 5 rows of the file displayed as a mini table
- [ ] "Upload & Validate" button

### Step 3 — Review Results (mock two states)

**State A — Success:**
- [ ] Green banner: "Upload complete. 200 of 200 rows imported successfully."
- [ ] Stats row: Total Rows: 200 | Valid: 200 | Errors: 0
- [ ] "View Products" button → navigates to All Products page

**State B — Partial Errors (show this state by default for the mock):**
- [ ] Amber banner: "Upload completed with errors. 132 of 150 rows imported."
- [ ] Stats row: Total: 150 | Valid: 132 | Errors: 18
- [ ] Error table below with columns: **Row #** | **SKU** | **Column** | **Error**
- [ ] Sample error rows (hardcoded):
  - Row 14 | 91257B001 | material | "Stainless" is not an allowed value. Use: 316 Stainless Steel, 18-8 Stainless Steel
  - Row 27 | 91257B002 | length | Must be a number. Received: "1.5 inches"
  - Row 45 | 91257B003 | sku | SKU already exists in the system
- [ ] "Download Error Report" button (mock — toast "Error report downloaded")
- [ ] "View Imported Products" button → navigates to All Products filtered to DRAFT

### Toggle between states
- [ ] Add a small dev toggle (label: "Preview:") with two options "Success" and "Errors" so you can switch between states during development. Remove this in Phase 2.

---

## STEP 6 — Upload History Page

**Route:** `/dhthub-admin/upload-history`

### Layout
- [ ] Page title: "Upload History"
- [ ] Subtitle: "All previous bulk upload batches"
- [ ] Filter bar: date range picker | status filter dropdown | uploaded by dropdown

### Batches Table
- [ ] Table columns: **Date** | **File Name** | **Category** | **Uploaded By** | **Total** | **Valid** | **Errors** | **Status** | **Actions**
- [ ] Render rows from `mockUploadBatches`
- [ ] Status badge colors:
  - PENDING = gray
  - VALIDATING = blue with a spinning indicator
  - VALIDATION_FAILED = red
  - PROCESSING = blue
  - COMPLETED = green
  - COMPLETED_WITH_ERRORS = amber
- [ ] Actions column:
  - View Details (opens slide-over)
  - Download Error Report (only visible if errorRows > 0)
- [ ] Clicking a row or "View Details" opens a slide-over:
  - Batch ID, category, uploaded by, timestamps
  - Stats: total, valid, errors
  - Full error log table (same format as Upload page Step 3)
  - List of products created (links to product list filtered by this batch)

---

## STEP 7 — Review Queue Page

**Route:** `/dhthub-admin/review`

### Layout
- [ ] Page title: "Review Queue"
- [ ] Subtitle: "Products submitted for review before publishing"
- [ ] Count of pending items shown in subtitle: "3 items awaiting review"

### Review List
- [ ] Each item is a card (not a table row — cards work better for review)
- [ ] Card layout:
  - Left: product SKU (monospace) and name (bold)
  - Below name: category breadcrumb path in small gray
  - Below path: "Submitted by Sarah K. on Jan 16, 2024 at 10:00 AM"
  - Right side: "View Details" button
- [ ] Clicking "View Details" expands the card inline (accordion style) to show:
  - All attribute values in a two-column spec table
  - Price, stock status
  - Core info: SKU, category, uploaded by
  - Image placeholders
  - Three action buttons at the bottom:
    - **Approve** (green button) — mock: changes card status badge to "Approved", removes from queue after 1 second delay
    - **Request Changes** (yellow outline button) — opens a small inline text area "Describe what needs to be changed" with a Submit button
    - **Reject** (red outline button) — opens a small inline text area "Reason for rejection" with a Submit button
- [ ] When queue is empty: show empty state illustration with text "All caught up! No products waiting for review."

---

## STEP 8 — Schema Change Requests Page

**Route:** `/dhthub-admin/schema-requests`

### Layout
- [ ] Page title: "Schema Change Requests"
- [ ] Subtitle: "Requests to modify attribute schemas for categories that already have products"
- [ ] Status filter tabs: **Pending** | **Approved** | **Rejected** | **All**

### Requests Table
- [ ] Mock 2-3 hardcoded requests
- [ ] Table columns: **Date** | **Category** | **Requested By** | **Change Type** | **Description** | **Status** | **Actions**
- [ ] Change Type badge options: Add Attribute | Modify Attribute | Add Allowed Value | Remove Allowed Value
- [ ] Status badge: Pending = amber, Approved = green, Rejected = red
- [ ] Actions (for Pending): **Review** button → opens slide-over
- [ ] Slide-over for review:
  - Category name and path
  - Requested by + date
  - Change type
  - Description (plain English from requester)
  - "Proposed Change" section showing before/after (hardcode an example):
    - "Adding new allowed value 'Black Oxide Coated' to the Finish attribute"
  - Impact note: "This affects 142 existing products. They will have no value for this attribute until manually updated."
  - Reviewer comment text area
  - **Approve** and **Reject** buttons


---

## PHASE 1 COMPLETION CHECKLIST

- [ ] `lib/mock-data.ts` created with all mock arrays
- [ ] Sidebar has all new sections added without touching existing items
- [ ] `/dhthub-admin/categories` — tree view + add/edit slide-over working
- [ ] `/dhthub-admin/attributes` — leaf selector + schema table + add/edit slide-over working
- [ ] `/dhthub-admin/products` — table with filters + product detail slide-over + add product slide-over working
- [ ] `/dhthub-admin/upload` — 3-step flow with both success/error states working
- [ ] `/dhthub-admin/upload-history` — batch table + detail slide-over working
- [ ] `/dhthub-admin/review` — card list + expand/approve/reject working
- [ ] `/dhthub-admin/schema-requests` — requests table + review slide-over working
- [ ] All pages accessible from the new sidebar sections
- [ ] No real API calls anywhere — all data from `mock-data.ts`
- [ ] Toast notifications working on all save/action buttons

---

## PHASE 2 PREVIEW (Do not build yet)
Phase 2 will cover:
- Prisma schema and database setup
- API routes for every action currently mocked
- Replacing mock data with real API calls
- CSV upload worker (BullMQ)
- Authentication and role-based access control
- Search integration
