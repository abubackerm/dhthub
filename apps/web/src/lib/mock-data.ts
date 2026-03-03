// Mock data for Phase 1 UI development
// All data is hardcoded - no API calls

export type CategoryType = "BRANCH" | "LEAF";

export interface Category {
  id: string;
  name: string;
  slug: string;
  type: CategoryType;
  depth: number;
  parentId: string | null;
  productCount: number;
  childCount: number;
  isActive: boolean;
  iconName?: string;
  imageUrl?: string;
  children: Category[];
}

export interface Attribute {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  dataType: "NUMBER" | "SELECT" | "MULTI_SELECT" | "BOOLEAN" | "TEXT";
  filterType: "RANGE" | "CHECKBOX_LIST" | "TOGGLE" | "NOT_FILTERABLE";
  unit: string | null;
  isRequired: boolean;
  isFilterable: boolean;
  isVisibleInTable: boolean;
  sortOrder: number;
  allowedValues: string[];
  helpText?: string;
  showInSpecSheet?: boolean;
}

export type ProductStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "REJECTED" | "ARCHIVED";

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryPath: string;
  status: ProductStatus;
  basePrice: number;
  inStock: boolean;
  stockQty?: number;
  minOrderQty?: number;
  leadTimeDays?: number;
  uploadedBy: string;
  createdAt: string;
  attributes: Record<string, string>;
  rejectionReason?: string;
  pdfSpecUrl?: string;
}

export type UploadBatchStatus = "PENDING" | "VALIDATING" | "VALIDATION_FAILED" | "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS";

export interface UploadBatch {
  id: string;
  categoryName: string;
  categoryPath: string;
  uploadedBy: string;
  originalFilename: string;
  status: UploadBatchStatus;
  totalRows: number;
  validRows: number;
  errorRows: number;
  createdAt: string;
  completedAt: string | null;
  errors?: UploadError[];
}

export interface UploadError {
  rowNumber: number;
  sku: string;
  column: string;
  error: string;
}

export interface ReviewQueueItem {
  id: string;
  sku: string;
  name: string;
  categoryPath: string;
  uploadedBy: string;
  submittedAt: string;
  batchId: string;
  attributes: Record<string, string>;
  price: number;
}

export type UserRole = "SUPER_ADMIN" | "CATEGORY_ADMIN" | "REVIEWER" | "DATA_ENTRY";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: string;
}

export type SchemaRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SchemaChangeType = "ADD_ATTRIBUTE" | "MODIFY_ATTRIBUTE" | "ADD_ALLOWED_VALUE" | "REMOVE_ALLOWED_VALUE";

export interface SchemaChangeRequest {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryPath: string;
  requestedBy: string;
  changeType: SchemaChangeType;
  description: string;
  status: SchemaRequestStatus;
  createdAt: string;
  proposedChange?: string;
  impactNote?: string;
  reviewerComment?: string;
}

// Categories with nested structure (McMaster-Carr style)
export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Fastening & Joining",
    slug: "fastening-joining",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 10,
    isActive: true,
    iconName: "Wrench",
    children: [
      {
        id: "2",
        name: "Screws & Bolts",
        slug: "screws-bolts",
        type: "BRANCH",
        depth: 1,
        parentId: "1",
        productCount: 0,
        childCount: 2,
        isActive: true,
        iconName: "Bolt",
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
            iconName: "Bolt",
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
            iconName: "Bolt",
            children: []
          }
        ]
      },
      {
        id: "101",
        name: "Threaded Rods & Studs",
        slug: "threaded-rods-studs",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 312,
        childCount: 0,
        isActive: true,
        iconName: "Minus",
        children: []
      },
      {
        id: "102",
        name: "Eyebolts",
        slug: "eyebolts",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 87,
        childCount: 0,
        isActive: true,
        iconName: "CircleDot",
        children: []
      },
      {
        id: "103",
        name: "U-Bolts",
        slug: "u-bolts",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 64,
        childCount: 0,
        isActive: true,
        iconName: "Undo2",
        children: []
      },
      {
        id: "104",
        name: "Brackets",
        slug: "brackets",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 198,
        childCount: 0,
        isActive: true,
        iconName: "CornerDownRight",
        children: []
      },
      {
        id: "8",
        name: "Nuts",
        slug: "nuts",
        type: "BRANCH",
        depth: 1,
        parentId: "1",
        productCount: 0,
        childCount: 1,
        isActive: true,
        iconName: "Hexagon",
        children: [
          {
            id: "9",
            name: "Hex Nuts",
            slug: "hex-nuts",
            type: "LEAF",
            depth: 2,
            parentId: "8",
            productCount: 67,
            childCount: 0,
            isActive: true,
            iconName: "Hexagon",
            children: []
          }
        ]
      },
      {
        id: "105",
        name: "Washers",
        slug: "washers",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 256,
        childCount: 0,
        isActive: true,
        iconName: "Circle",
        children: []
      },
      {
        id: "106",
        name: "Pins",
        slug: "pins",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 145,
        childCount: 0,
        isActive: true,
        iconName: "Pin",
        children: []
      },
      {
        id: "107",
        name: "Anchors",
        slug: "anchors",
        type: "LEAF",
        depth: 1,
        parentId: "1",
        productCount: 178,
        childCount: 0,
        isActive: true,
        iconName: "Anchor",
        children: []
      },
      {
        id: "6",
        name: "Screws",
        slug: "screws",
        type: "BRANCH",
        depth: 1,
        parentId: "1",
        productCount: 0,
        childCount: 1,
        isActive: true,
        iconName: "ScrewIcon",
        children: [
          {
            id: "7",
            name: "Machine Screws",
            slug: "machine-screws",
            type: "LEAF",
            depth: 2,
            parentId: "6",
            productCount: 234,
            childCount: 0,
            isActive: true,
            iconName: "Settings",
            children: []
          }
        ]
      }
    ]
  },
  {
    id: "20",
    name: "Abrasives & Polishing",
    slug: "abrasives-polishing",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 5,
    isActive: true,
    iconName: "Disc",
    children: [
      {
        id: "201",
        name: "Grinding Wheels",
        slug: "grinding-wheels",
        type: "LEAF",
        depth: 1,
        parentId: "20",
        productCount: 230,
        childCount: 0,
        isActive: true,
        iconName: "Disc",
        children: []
      },
      {
        id: "202",
        name: "Sandpaper & Sanding",
        slug: "sandpaper-sanding",
        type: "LEAF",
        depth: 1,
        parentId: "20",
        productCount: 180,
        childCount: 0,
        isActive: true,
        iconName: "Layers",
        children: []
      },
      {
        id: "203",
        name: "Cutting Discs",
        slug: "cutting-discs",
        type: "LEAF",
        depth: 1,
        parentId: "20",
        productCount: 95,
        childCount: 0,
        isActive: true,
        iconName: "Scissors",
        children: []
      },
      {
        id: "204",
        name: "Polishing Compounds",
        slug: "polishing-compounds",
        type: "LEAF",
        depth: 1,
        parentId: "20",
        productCount: 112,
        childCount: 0,
        isActive: true,
        iconName: "Sparkles",
        children: []
      },
      {
        id: "205",
        name: "Wire Brushes",
        slug: "wire-brushes",
        type: "LEAF",
        depth: 1,
        parentId: "20",
        productCount: 78,
        childCount: 0,
        isActive: true,
        iconName: "Brush",
        children: []
      }
    ]
  },
  {
    id: "30",
    name: "Fabricating",
    slug: "fabricating",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 5,
    isActive: true,
    iconName: "Factory",
    children: [
      {
        id: "301",
        name: "Sheet Metal",
        slug: "sheet-metal",
        type: "LEAF",
        depth: 1,
        parentId: "30",
        productCount: 340,
        childCount: 0,
        isActive: true,
        iconName: "Square",
        children: []
      },
      {
        id: "302",
        name: "Metal Bars & Rods",
        slug: "metal-bars-rods",
        type: "LEAF",
        depth: 1,
        parentId: "30",
        productCount: 280,
        childCount: 0,
        isActive: true,
        iconName: "Minus",
        children: []
      },
      {
        id: "303",
        name: "Welding Supplies",
        slug: "welding-supplies",
        type: "LEAF",
        depth: 1,
        parentId: "30",
        productCount: 150,
        childCount: 0,
        isActive: true,
        iconName: "Flame",
        children: []
      },
      {
        id: "304",
        name: "Cutting Tools",
        slug: "cutting-tools",
        type: "LEAF",
        depth: 1,
        parentId: "30",
        productCount: 200,
        childCount: 0,
        isActive: true,
        iconName: "Scissors",
        children: []
      },
      {
        id: "305",
        name: "Adhesives & Tape",
        slug: "adhesives-tape",
        type: "LEAF",
        depth: 1,
        parentId: "30",
        productCount: 175,
        childCount: 0,
        isActive: true,
        iconName: "Paperclip",
        children: []
      }
    ]
  },
  {
    id: "40",
    name: "Electrical",
    slug: "electrical",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 5,
    isActive: true,
    iconName: "Zap",
    children: [
      {
        id: "401",
        name: "Wire & Cable",
        slug: "wire-cable",
        type: "LEAF",
        depth: 1,
        parentId: "40",
        productCount: 420,
        childCount: 0,
        isActive: true,
        iconName: "Cable",
        children: []
      },
      {
        id: "402",
        name: "Connectors",
        slug: "connectors",
        type: "LEAF",
        depth: 1,
        parentId: "40",
        productCount: 310,
        childCount: 0,
        isActive: true,
        iconName: "Plug",
        children: []
      },
      {
        id: "403",
        name: "Circuit Protection",
        slug: "circuit-protection",
        type: "LEAF",
        depth: 1,
        parentId: "40",
        productCount: 180,
        childCount: 0,
        isActive: true,
        iconName: "ShieldCheck",
        children: []
      },
      {
        id: "404",
        name: "Switches & Relays",
        slug: "switches-relays",
        type: "LEAF",
        depth: 1,
        parentId: "40",
        productCount: 245,
        childCount: 0,
        isActive: true,
        iconName: "ToggleRight",
        children: []
      },
      {
        id: "405",
        name: "Terminal Blocks",
        slug: "terminal-blocks",
        type: "LEAF",
        depth: 1,
        parentId: "40",
        productCount: 128,
        childCount: 0,
        isActive: true,
        iconName: "Grid3x3",
        children: []
      }
    ]
  },
  {
    id: "50",
    name: "Power Transmission",
    slug: "power-transmission",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 5,
    isActive: true,
    iconName: "Cog",
    children: [
      {
        id: "501",
        name: "Bearings",
        slug: "bearings",
        type: "LEAF",
        depth: 1,
        parentId: "50",
        productCount: 380,
        childCount: 0,
        isActive: true,
        iconName: "Circle",
        children: []
      },
      {
        id: "502",
        name: "Gears",
        slug: "gears",
        type: "LEAF",
        depth: 1,
        parentId: "50",
        productCount: 220,
        childCount: 0,
        isActive: true,
        iconName: "Cog",
        children: []
      },
      {
        id: "503",
        name: "Belts & Pulleys",
        slug: "belts-pulleys",
        type: "LEAF",
        depth: 1,
        parentId: "50",
        productCount: 175,
        childCount: 0,
        isActive: true,
        iconName: "RotateCcw",
        children: []
      },
      {
        id: "504",
        name: "Chains & Sprockets",
        slug: "chains-sprockets",
        type: "LEAF",
        depth: 1,
        parentId: "50",
        productCount: 140,
        childCount: 0,
        isActive: true,
        iconName: "Link",
        children: []
      },
      {
        id: "505",
        name: "Motors & Drives",
        slug: "motors-drives",
        type: "LEAF",
        depth: 1,
        parentId: "50",
        productCount: 195,
        childCount: 0,
        isActive: true,
        iconName: "Gauge",
        children: []
      }
    ]
  },
  {
    id: "5",
    name: "Pipe, Tubing, Hose & Fittings",
    slug: "pipe-tubing-hose-fittings",
    type: "BRANCH",
    depth: 0,
    parentId: null,
    productCount: 0,
    childCount: 5,
    isActive: true,
    iconName: "Cylinder",
    children: [
      {
        id: "10",
        name: "Steel Tubing",
        slug: "steel-tubing",
        type: "LEAF",
        depth: 1,
        parentId: "5",
        productCount: 156,
        childCount: 0,
        isActive: true,
        iconName: "Cylinder",
        children: []
      },
      {
        id: "11",
        name: "Aluminum Tubing",
        slug: "aluminum-tubing",
        type: "LEAF",
        depth: 1,
        parentId: "5",
        productCount: 98,
        childCount: 0,
        isActive: true,
        iconName: "Cylinder",
        children: []
      },
      {
        id: "601",
        name: "Pipe Fittings",
        slug: "pipe-fittings",
        type: "LEAF",
        depth: 1,
        parentId: "5",
        productCount: 290,
        childCount: 0,
        isActive: true,
        iconName: "GitBranch",
        children: []
      },
      {
        id: "602",
        name: "Hoses",
        slug: "hoses",
        type: "LEAF",
        depth: 1,
        parentId: "5",
        productCount: 185,
        childCount: 0,
        isActive: true,
        iconName: "Waves",
        children: []
      },
      {
        id: "603",
        name: "Valves",
        slug: "valves",
        type: "LEAF",
        depth: 1,
        parentId: "5",
        productCount: 210,
        childCount: 0,
        isActive: true,
        iconName: "Settings2",
        children: []
      }
    ]
  }
];

// Attributes for categories
export const mockAttributes: Attribute[] = [
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
    allowedValues: ["1/4-20", "5/16-18", "3/8-16", "1/2-13"],
    helpText: "Enter the thread standard e.g. 1/4-20",
    showInSpecSheet: true
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
    allowedValues: [],
    helpText: "Length in inches",
    showInSpecSheet: true
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
    allowedValues: ["316 Stainless Steel", "18-8 Stainless Steel", "304 Stainless Steel"],
    showInSpecSheet: true
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
    allowedValues: ["Plain", "Passivated", "Black Oxide"],
    showInSpecSheet: true
  },
  {
    id: "a5",
    categoryId: "4",
    name: "Thread Size",
    slug: "thread_size",
    dataType: "SELECT",
    filterType: "CHECKBOX_LIST",
    unit: null,
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 1,
    allowedValues: ["1/4-20", "5/16-18", "3/8-16", "1/2-13", "5/8-11"],
    showInSpecSheet: true
  },
  {
    id: "a6",
    categoryId: "4",
    name: "Length",
    slug: "length",
    dataType: "NUMBER",
    filterType: "RANGE",
    unit: "in",
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 2,
    allowedValues: [],
    showInSpecSheet: true
  },
  {
    id: "a7",
    categoryId: "4",
    name: "Finish",
    slug: "finish",
    dataType: "SELECT",
    filterType: "CHECKBOX_LIST",
    unit: null,
    isRequired: false,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 3,
    allowedValues: ["Plain", "Zinc Plated", "Hot-Dip Galvanized"],
    showInSpecSheet: true
  },
  {
    id: "a8",
    categoryId: "10",
    name: "Outer Diameter",
    slug: "outer_diameter",
    dataType: "NUMBER",
    filterType: "RANGE",
    unit: "in",
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 1,
    allowedValues: [],
    showInSpecSheet: true
  },
  {
    id: "a9",
    categoryId: "10",
    name: "Wall Thickness",
    slug: "wall_thickness",
    dataType: "NUMBER",
    filterType: "RANGE",
    unit: "in",
    isRequired: true,
    isFilterable: true,
    isVisibleInTable: true,
    sortOrder: 2,
    allowedValues: [],
    showInSpecSheet: true
  }
];

// Products
export const mockProducts: Product[] = [
  {
    id: "p1",
    sku: "91257A123",
    name: "Hex Head Screw 1/4-20 x 1in Stainless",
    categoryId: "3",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    status: "PUBLISHED",
    basePrice: 0.45,
    inStock: true,
    stockQty: 500,
    minOrderQty: 10,
    leadTimeDays: 3,
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
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    status: "IN_REVIEW",
    basePrice: 0.52,
    inStock: true,
    stockQty: 350,
    minOrderQty: 10,
    leadTimeDays: 3,
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
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    status: "DRAFT",
    basePrice: 0.78,
    inStock: false,
    stockQty: 0,
    minOrderQty: 10,
    leadTimeDays: 7,
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
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    status: "REJECTED",
    basePrice: 1.12,
    inStock: true,
    stockQty: 200,
    minOrderQty: 5,
    leadTimeDays: 3,
    uploadedBy: "James T.",
    createdAt: "2024-01-18",
    attributes: {
      thread_size: "3/8-16",
      length: "2.5",
      material: "316 Stainless Steel",
      finish: "Black Oxide"
    },
    rejectionReason: "Incorrect material value - use the allowed values list"
  },
  {
    id: "p5",
    sku: "91251A001",
    name: "Grade 8 Hex Bolt 1/2-13 x 3in",
    categoryId: "4",
    categoryPath: "Fastening & Joining > Screws & Bolts > Grade 8 Hex Bolts",
    status: "PUBLISHED",
    basePrice: 1.45,
    inStock: true,
    stockQty: 150,
    minOrderQty: 5,
    leadTimeDays: 5,
    uploadedBy: "Sarah K.",
    createdAt: "2024-01-20",
    attributes: {
      thread_size: "1/2-13",
      length: "3",
      finish: "Zinc Plated"
    }
  },
  {
    id: "p6",
    sku: "91251A002",
    name: "Grade 8 Hex Bolt 5/8-11 x 4in",
    categoryId: "4",
    categoryPath: "Fastening & Joining > Screws & Bolts > Grade 8 Hex Bolts",
    status: "PUBLISHED",
    basePrice: 2.89,
    inStock: true,
    stockQty: 75,
    minOrderQty: 5,
    leadTimeDays: 5,
    uploadedBy: "James T.",
    createdAt: "2024-01-21",
    attributes: {
      thread_size: "5/8-11",
      length: "4",
      finish: "Plain"
    }
  },
  {
    id: "p7",
    sku: "74695A12",
    name: "Steel Tube 1in OD x 0.065in Wall",
    categoryId: "10",
    categoryPath: "Pipe, Tubing, Hose & Fittings > Steel Tubing",
    status: "PUBLISHED",
    basePrice: 12.50,
    inStock: true,
    stockQty: 50,
    minOrderQty: 1,
    leadTimeDays: 7,
    uploadedBy: "Sarah K.",
    createdAt: "2024-01-22",
    attributes: {
      outer_diameter: "1",
      wall_thickness: "0.065"
    }
  }
];

// Upload Batches
export const mockUploadBatches: UploadBatch[] = [
  {
    id: "b1",
    categoryName: "Stainless Steel Hex Bolts",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
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
    categoryPath: "Fastening & Joining > Screws & Bolts > Grade 8 Hex Bolts",
    uploadedBy: "James T.",
    originalFilename: "grade8_upload.csv",
    status: "COMPLETED_WITH_ERRORS",
    totalRows: 150,
    validRows: 132,
    errorRows: 18,
    createdAt: "2024-01-16 02:15 PM",
    completedAt: "2024-01-16 02:16 PM",
    errors: [
      { rowNumber: 14, sku: "91257B001", column: "material", error: "\"Stainless\" is not an allowed value. Use: 316 Stainless Steel, 18-8 Stainless Steel" },
      { rowNumber: 27, sku: "91257B002", column: "length", error: "Must be a number. Received: \"1.5 inches\"" },
      { rowNumber: 45, sku: "91257B003", column: "sku", error: "SKU already exists in the system" }
    ]
  },
  {
    id: "b3",
    categoryName: "Stainless Steel Hex Bolts",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    uploadedBy: "Sarah K.",
    originalFilename: "hex_bolts_jan_batch2.csv",
    status: "VALIDATING",
    totalRows: 300,
    validRows: 0,
    errorRows: 0,
    createdAt: "2024-01-17 11:00 AM",
    completedAt: null
  },
  {
    id: "b4",
    categoryName: "Steel Tubing",
    categoryPath: "Pipe, Tubing, Hose & Fittings > Steel Tubing",
    uploadedBy: "James T.",
    originalFilename: "steel_tubing_feb.csv",
    status: "PENDING",
    totalRows: 0,
    validRows: 0,
    errorRows: 0,
    createdAt: "2024-01-18 08:45 AM",
    completedAt: null
  }
];

// Review Queue
export const mockReviewQueue: ReviewQueueItem[] = [
  {
    id: "r1",
    sku: "91257A124",
    name: "Hex Head Screw 1/4-20 x 1.5in Stainless",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
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
  },
  {
    id: "r2",
    sku: "91257A127",
    name: "Hex Head Screw 3/8-16 x 3in Stainless",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    uploadedBy: "James T.",
    submittedAt: "2024-01-17 02:30 PM",
    batchId: "b1",
    attributes: {
      thread_size: "3/8-16",
      length: "3",
      material: "316 Stainless Steel",
      finish: "Passivated"
    },
    price: 1.25
  },
  {
    id: "r3",
    sku: "91251A003",
    name: "Grade 8 Hex Bolt 3/8-16 x 2in",
    categoryPath: "Fastening & Joining > Screws & Bolts > Grade 8 Hex Bolts",
    uploadedBy: "Sarah K.",
    submittedAt: "2024-01-18 09:15 AM",
    batchId: "b2",
    attributes: {
      thread_size: "3/8-16",
      length: "2",
      finish: "Plain"
    },
    price: 0.89
  }
];

// Users
export const mockUsers: User[] = [
  { id: "u1", name: "Admin User", email: "admin@company.com", role: "SUPER_ADMIN", isActive: true, joinedAt: "2023-12-01" },
  { id: "u2", name: "Sarah K.", email: "sarah@company.com", role: "DATA_ENTRY", isActive: true, joinedAt: "2024-01-01" },
  { id: "u3", name: "James T.", email: "james@company.com", role: "DATA_ENTRY", isActive: true, joinedAt: "2024-01-05" },
  { id: "u4", name: "Reviewer One", email: "review@company.com", role: "REVIEWER", isActive: true, joinedAt: "2023-12-15" },
  { id: "u5", name: "Cat Admin", email: "catadmin@company.com", role: "CATEGORY_ADMIN", isActive: false, joinedAt: "2023-11-01" }
];

// Schema Change Requests
export const mockSchemaRequests: SchemaChangeRequest[] = [
  {
    id: "sr1",
    categoryId: "3",
    categoryName: "Stainless Steel Hex Bolts",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    requestedBy: "Sarah K.",
    changeType: "ADD_ALLOWED_VALUE",
    description: "Add 'Black Oxide Coated' as an option for the Finish attribute to support new product line",
    status: "PENDING",
    createdAt: "2024-01-18 10:30 AM",
    proposedChange: "Adding new allowed value 'Black Oxide Coated' to the Finish attribute",
    impactNote: "This affects 142 existing products. They will have no value for this attribute until manually updated."
  },
  {
    id: "sr2",
    categoryId: "3",
    categoryName: "Stainless Steel Hex Bolts",
    categoryPath: "Fastening & Joining > Screws & Bolts > Stainless Steel Hex Bolts",
    requestedBy: "James T.",
    changeType: "ADD_ATTRIBUTE",
    description: "Add 'Head Type' attribute to distinguish between different hex head styles",
    status: "PENDING",
    createdAt: "2024-01-17 03:45 PM",
    proposedChange: "Adding new attribute 'Head Type' with values: Standard, Flanged, Serrated",
    impactNote: "This affects 142 existing products. New attribute will be optional."
  },
  {
    id: "sr3",
    categoryId: "4",
    categoryName: "Grade 8 Hex Bolts",
    categoryPath: "Fastening & Joining > Screws & Bolts > Grade 8 Hex Bolts",
    requestedBy: "Sarah K.",
    changeType: "MODIFY_ATTRIBUTE",
    description: "Make Finish attribute required instead of optional",
    status: "APPROVED",
    createdAt: "2024-01-15 11:00 AM",
    proposedChange: "Changing 'Finish' attribute from optional to required",
    impactNote: "This affects 89 existing products. Products without a finish value will need to be updated.",
    reviewerComment: "Approved - finish is important for Grade 8 bolts due to corrosion concerns."
  }
];

// Helper functions
export function getLeafCategories(categories: Category[]): Category[] {
  const leaves: Category[] = [];

  function traverse(items: Category[]) {
    for (const item of items) {
      if (item.type === "LEAF") {
        leaves.push(item);
      }
      if (item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(categories);
  return leaves;
}

export function getCategoryById(categories: Category[], id: string): Category | undefined {
  function find(items: Category[]): Category | undefined {
    for (const item of items) {
      if (item.id === id) return item;
      const found = find(item.children);
      if (found) return found;
    }
    return undefined;
  }

  return find(categories);
}

export function getAttributesForCategory(categoryId: string): Attribute[] {
  return mockAttributes.filter(attr => attr.categoryId === categoryId);
}

export function getProductsForCategory(categoryId: string): Product[] {
  return mockProducts.filter(product => product.categoryId === categoryId);
}
