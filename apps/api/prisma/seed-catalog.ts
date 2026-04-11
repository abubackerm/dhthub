import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding catalog data...');

  // ──────────────────────────────────────────
  // 1. Restructure categories into McMaster-style tree
  //    Keep existing root "Tekrex" and rebuild children
  // ──────────────────────────────────────────

  const existingRoot = await prisma.category.findUnique({ where: { slug: 'tekrex' } });
  if (!existingRoot) {
    throw new Error('Root category "tekrex" not found. Create it first.');
  }

  // Delete existing children to rebuild cleanly
  await prisma.categoryAttribute.deleteMany({});
  await prisma.category.deleteMany({ where: { parentId: { not: null } } });

  // Branch: Fasteners
  const fasteners = await prisma.category.create({
    data: {
      name: 'Fasteners',
      slug: 'fasteners',
      path: 'tekrex.fasteners',
      parentId: existingRoot.id,
      sortOrder: 1,
      isActive: true,
    },
  });

  // Leaf categories under Fasteners
  const hexBolts = await prisma.category.create({
    data: {
      name: 'Hex Bolts',
      slug: 'hex-bolts',
      path: 'tekrex.fasteners.hex-bolts',
      parentId: fasteners.id,
      sortOrder: 1,
      isActive: true,
    },
  });

  const socketScrews = await prisma.category.create({
    data: {
      name: 'Socket Head Cap Screws',
      slug: 'socket-head-cap-screws',
      path: 'tekrex.fasteners.socket-head-cap-screws',
      parentId: fasteners.id,
      sortOrder: 2,
      isActive: true,
    },
  });

  const washers = await prisma.category.create({
    data: {
      name: 'Flat Washers',
      slug: 'flat-washers',
      path: 'tekrex.fasteners.flat-washers',
      parentId: fasteners.id,
      sortOrder: 3,
      isActive: true,
    },
  });

  const nuts = await prisma.category.create({
    data: {
      name: 'Hex Nuts',
      slug: 'hex-nuts',
      path: 'tekrex.fasteners.hex-nuts',
      parentId: fasteners.id,
      sortOrder: 4,
      isActive: true,
    },
  });

  // Branch: Raw Materials
  const rawMaterials = await prisma.category.create({
    data: {
      name: 'Raw Materials',
      slug: 'raw-materials',
      path: 'tekrex.raw-materials',
      parentId: existingRoot.id,
      sortOrder: 2,
      isActive: true,
    },
  });

  const steelSheets = await prisma.category.create({
    data: {
      name: 'Steel Sheets',
      slug: 'steel-sheets',
      path: 'tekrex.raw-materials.steel-sheets',
      parentId: rawMaterials.id,
      sortOrder: 1,
      isActive: true,
    },
  });

  const aluminumBars = await prisma.category.create({
    data: {
      name: 'Aluminum Bars',
      slug: 'aluminum-bars',
      path: 'tekrex.raw-materials.aluminum-bars',
      parentId: rawMaterials.id,
      sortOrder: 2,
      isActive: true,
    },
  });

  console.log('  Categories created');

  // ──────────────────────────────────────────
  // 2. Unit Definitions
  // ──────────────────────────────────────────

  const unitMm = await prisma.unitDefinition.upsert({
    where: { name: 'mm' },
    update: {},
    create: { name: 'mm' },
  });

  const unitIn = await prisma.unitDefinition.upsert({
    where: { name: 'in' },
    update: {},
    create: { name: 'in' },
  });

  console.log('  Units created');

  // ──────────────────────────────────────────
  // 3. Attribute Definitions
  // ──────────────────────────────────────────

  const attrDiameter = await prisma.attributeDefinition.create({
    data: {
      name: 'Diameter',
      slug: 'diameter',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 1,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrLength = await prisma.attributeDefinition.create({
    data: {
      name: 'Length',
      slug: 'length',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 2,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrThreadPitch = await prisma.attributeDefinition.create({
    data: {
      name: 'Thread Pitch',
      slug: 'thread-pitch',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 3,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: false,
    },
  });

  const attrMaterial = await prisma.attributeDefinition.create({
    data: {
      name: 'Material',
      slug: 'material',
      dataType: 'enum',
      group: 'Material',
      sortOrder: 4,
      filterType: 'CHECKBOX',
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrFinish = await prisma.attributeDefinition.create({
    data: {
      name: 'Finish',
      slug: 'finish',
      dataType: 'enum',
      group: 'Material',
      sortOrder: 5,
      filterType: 'CHECKBOX',
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrGrade = await prisma.attributeDefinition.create({
    data: {
      name: 'Grade',
      slug: 'grade',
      dataType: 'enum',
      group: 'Specifications',
      sortOrder: 6,
      filterType: 'CHECKBOX',
      isFilterable: true,
      isRequired: false,
    },
  });

  const attrThickness = await prisma.attributeDefinition.create({
    data: {
      name: 'Thickness',
      slug: 'thickness',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 7,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrWidth = await prisma.attributeDefinition.create({
    data: {
      name: 'Width',
      slug: 'width',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 8,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  console.log('  Attribute definitions created');

  // ──────────────────────────────────────────
  // 4. Attribute Options (for enum attributes)
  // ──────────────────────────────────────────

  const materials = ['Steel', 'Stainless Steel', 'Aluminum', 'Brass', 'Titanium'];
  const materialOptions: Record<string, string> = {};
  for (let i = 0; i < materials.length; i++) {
    const opt = await prisma.attributeOption.create({
      data: {
        attributeId: attrMaterial.id,
        label: materials[i],
        value: materials[i].toLowerCase().replace(/\s+/g, '-'),
        sortOrder: i,
      },
    });
    materialOptions[materials[i]] = opt.id;
  }

  const finishes = ['Zinc Plated', 'Black Oxide', 'Plain', 'Hot-Dip Galvanized', 'Chrome'];
  const finishOptions: Record<string, string> = {};
  for (let i = 0; i < finishes.length; i++) {
    const opt = await prisma.attributeOption.create({
      data: {
        attributeId: attrFinish.id,
        label: finishes[i],
        value: finishes[i].toLowerCase().replace(/\s+/g, '-'),
        sortOrder: i,
      },
    });
    finishOptions[finishes[i]] = opt.id;
  }

  const grades = ['Grade 5', 'Grade 8', 'Grade 10.9', 'Grade 12.9', 'A2-70', 'A4-80'];
  const gradeOptions: Record<string, string> = {};
  for (let i = 0; i < grades.length; i++) {
    const opt = await prisma.attributeOption.create({
      data: {
        attributeId: attrGrade.id,
        label: grades[i],
        value: grades[i].toLowerCase().replace(/[\s.]+/g, '-'),
        sortOrder: i,
      },
    });
    gradeOptions[grades[i]] = opt.id;
  }

  console.log('  Attribute options created');

  // ──────────────────────────────────────────
  // 5. Assign Attributes to Leaf Categories
  // ──────────────────────────────────────────

  // Hex Bolts: diameter, length, thread-pitch, material, finish, grade
  const hexBoltAttrs = [attrDiameter, attrLength, attrThreadPitch, attrMaterial, attrFinish, attrGrade];
  for (const attr of hexBoltAttrs) {
    await prisma.categoryAttribute.create({
      data: { categoryId: hexBolts.id, attributeId: attr.id },
    });
  }

  // Socket Screws: diameter, length, material, finish, grade
  const socketAttrs = [attrDiameter, attrLength, attrMaterial, attrFinish, attrGrade];
  for (const attr of socketAttrs) {
    await prisma.categoryAttribute.create({
      data: { categoryId: socketScrews.id, attributeId: attr.id },
    });
  }

  // Flat Washers: diameter, thickness, material, finish
  const washerAttrs = [attrDiameter, attrThickness, attrMaterial, attrFinish];
  for (const attr of washerAttrs) {
    await prisma.categoryAttribute.create({
      data: { categoryId: washers.id, attributeId: attr.id },
    });
  }

  // Hex Nuts: diameter, thread-pitch, material, finish, grade
  const nutAttrs = [attrDiameter, attrThreadPitch, attrMaterial, attrFinish, attrGrade];
  for (const attr of nutAttrs) {
    await prisma.categoryAttribute.create({
      data: { categoryId: nuts.id, attributeId: attr.id },
    });
  }

  // Steel Sheets: thickness, width, length, material, finish
  const sheetAttrs = [attrThickness, attrWidth, attrLength, attrMaterial, attrFinish];
  for (const attr of sheetAttrs) {
    await prisma.categoryAttribute.create({
      data: { categoryId: steelSheets.id, attributeId: attr.id },
    });
  }

  // Aluminum Bars: diameter, length, material, finish
  const barAttrs = [attrDiameter, attrLength, attrMaterial, attrFinish];
  for (const attr of barAttrs) {
    await prisma.categoryAttribute.create({
      data: { categoryId: aluminumBars.id, attributeId: attr.id },
    });
  }

  console.log('  Category-attribute assignments created');

  // ──────────────────────────────────────────
  // 6. Products + Variants + Attribute Values
  // ──────────────────────────────────────────

  // --- HEX BOLTS ---
  const hexBoltProduct = await prisma.product.create({
    data: {
      name: 'Hex Head Cap Screw, Grade 8',
      slug: 'hex-head-cap-screw-grade-8',
      sku: 'HEX-G8',
      description: 'Medium-strength steel hex head cap screw. Grade 8, zinc plated.',
      type: 'variable',
      status: 'active',
      categoryId: hexBolts.id,
      isFeatured: true,
    },
  });

  const hexVariants = [
    { sku: 'HEX-G8-M6-20-ZN', name: 'M6 x 20mm Zinc', dia: 6, len: 20, pitch: 1.0, mat: 'Steel', fin: 'Zinc Plated', grd: 'Grade 8', price: 45, qty: 5000 },
    { sku: 'HEX-G8-M6-30-ZN', name: 'M6 x 30mm Zinc', dia: 6, len: 30, pitch: 1.0, mat: 'Steel', fin: 'Zinc Plated', grd: 'Grade 8', price: 52, qty: 4200 },
    { sku: 'HEX-G8-M8-25-ZN', name: 'M8 x 25mm Zinc', dia: 8, len: 25, pitch: 1.25, mat: 'Steel', fin: 'Zinc Plated', grd: 'Grade 8', price: 68, qty: 3800 },
    { sku: 'HEX-G8-M8-40-ZN', name: 'M8 x 40mm Zinc', dia: 8, len: 40, pitch: 1.25, mat: 'Steel', fin: 'Zinc Plated', grd: 'Grade 8', price: 85, qty: 2500 },
    { sku: 'HEX-G8-M10-30-ZN', name: 'M10 x 30mm Zinc', dia: 10, len: 30, pitch: 1.5, mat: 'Steel', fin: 'Zinc Plated', grd: 'Grade 8', price: 95, qty: 3000 },
    { sku: 'HEX-G8-M10-50-ZN', name: 'M10 x 50mm Zinc', dia: 10, len: 50, pitch: 1.5, mat: 'Steel', fin: 'Zinc Plated', grd: 'Grade 8', price: 120, qty: 2200 },
    { sku: 'HEX-G8-M12-40-BO', name: 'M12 x 40mm Black Oxide', dia: 12, len: 40, pitch: 1.75, mat: 'Steel', fin: 'Black Oxide', grd: 'Grade 8', price: 145, qty: 1800 },
    { sku: 'HEX-G8-M12-60-BO', name: 'M12 x 60mm Black Oxide', dia: 12, len: 60, pitch: 1.75, mat: 'Steel', fin: 'Black Oxide', grd: 'Grade 8', price: 175, qty: 1500 },
  ];

  for (let i = 0; i < hexVariants.length; i++) {
    const v = hexVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: hexBoltProduct.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { diameter: v.dia, length: v.len, threadPitch: v.pitch, material: v.mat, finish: v.fin, grade: v.grd },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrDiameter.id, numberValue: v.dia },
        { variantId: variant.id, attributeId: attrLength.id, numberValue: v.len },
        { variantId: variant.id, attributeId: attrThreadPitch.id, numberValue: v.pitch },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions[v.mat] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions[v.fin] },
        { variantId: variant.id, attributeId: attrGrade.id, optionId: gradeOptions[v.grd] },
      ],
    });
  }

  // --- STAINLESS STEEL HEX BOLTS ---
  const ssHexBolt = await prisma.product.create({
    data: {
      name: 'Hex Head Cap Screw, Stainless Steel A2-70',
      slug: 'hex-head-cap-screw-ss-a2-70',
      sku: 'HEX-SS-A2',
      description: 'Corrosion-resistant stainless steel hex head cap screw. A2-70 grade.',
      type: 'variable',
      status: 'active',
      categoryId: hexBolts.id,
      isFeatured: false,
    },
  });

  const ssHexVariants = [
    { sku: 'HEX-SS-M6-20', name: 'M6 x 20mm SS', dia: 6, len: 20, pitch: 1.0, price: 95, qty: 3000 },
    { sku: 'HEX-SS-M6-30', name: 'M6 x 30mm SS', dia: 6, len: 30, pitch: 1.0, price: 110, qty: 2500 },
    { sku: 'HEX-SS-M8-25', name: 'M8 x 25mm SS', dia: 8, len: 25, pitch: 1.25, price: 135, qty: 2000 },
    { sku: 'HEX-SS-M8-40', name: 'M8 x 40mm SS', dia: 8, len: 40, pitch: 1.25, price: 160, qty: 1800 },
    { sku: 'HEX-SS-M10-30', name: 'M10 x 30mm SS', dia: 10, len: 30, pitch: 1.5, price: 195, qty: 1500 },
    { sku: 'HEX-SS-M10-50', name: 'M10 x 50mm SS', dia: 10, len: 50, pitch: 1.5, price: 240, qty: 1200 },
  ];

  for (let i = 0; i < ssHexVariants.length; i++) {
    const v = ssHexVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: ssHexBolt.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { diameter: v.dia, length: v.len, threadPitch: v.pitch, material: 'Stainless Steel', finish: 'Plain', grade: 'A2-70' },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrDiameter.id, numberValue: v.dia },
        { variantId: variant.id, attributeId: attrLength.id, numberValue: v.len },
        { variantId: variant.id, attributeId: attrThreadPitch.id, numberValue: v.pitch },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions['Stainless Steel'] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions['Plain'] },
        { variantId: variant.id, attributeId: attrGrade.id, optionId: gradeOptions['A2-70'] },
      ],
    });
  }

  // --- SOCKET HEAD CAP SCREWS ---
  const socketProduct = await prisma.product.create({
    data: {
      name: 'Socket Head Cap Screw, Alloy Steel',
      slug: 'socket-head-cap-screw-alloy',
      sku: 'SHCS-ALLOY',
      description: 'High-strength alloy steel socket head cap screw. Black oxide finish.',
      type: 'variable',
      status: 'active',
      categoryId: socketScrews.id,
    },
  });

  const socketVariants = [
    { sku: 'SHCS-M4-12-BO', name: 'M4 x 12mm', dia: 4, len: 12, price: 35, qty: 8000 },
    { sku: 'SHCS-M4-20-BO', name: 'M4 x 20mm', dia: 4, len: 20, price: 40, qty: 6500 },
    { sku: 'SHCS-M5-16-BO', name: 'M5 x 16mm', dia: 5, len: 16, price: 42, qty: 7000 },
    { sku: 'SHCS-M5-25-BO', name: 'M5 x 25mm', dia: 5, len: 25, price: 48, qty: 5500 },
    { sku: 'SHCS-M6-20-BO', name: 'M6 x 20mm', dia: 6, len: 20, price: 55, qty: 4500 },
    { sku: 'SHCS-M6-30-BO', name: 'M6 x 30mm', dia: 6, len: 30, price: 62, qty: 4000 },
    { sku: 'SHCS-M8-25-BO', name: 'M8 x 25mm', dia: 8, len: 25, price: 78, qty: 3200 },
    { sku: 'SHCS-M8-40-BO', name: 'M8 x 40mm', dia: 8, len: 40, price: 92, qty: 2800 },
    { sku: 'SHCS-M10-30-BO', name: 'M10 x 30mm', dia: 10, len: 30, price: 115, qty: 2000 },
    { sku: 'SHCS-M10-50-BO', name: 'M10 x 50mm', dia: 10, len: 50, price: 140, qty: 1600 },
  ];

  for (let i = 0; i < socketVariants.length; i++) {
    const v = socketVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: socketProduct.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { diameter: v.dia, length: v.len, material: 'Steel', finish: 'Black Oxide', grade: 'Grade 12.9' },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrDiameter.id, numberValue: v.dia },
        { variantId: variant.id, attributeId: attrLength.id, numberValue: v.len },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions['Steel'] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions['Black Oxide'] },
        { variantId: variant.id, attributeId: attrGrade.id, optionId: gradeOptions['Grade 12.9'] },
      ],
    });
  }

  // --- FLAT WASHERS ---
  const washerProduct = await prisma.product.create({
    data: {
      name: 'Flat Washer, USS Pattern',
      slug: 'flat-washer-uss',
      sku: 'FW-USS',
      description: 'Standard USS pattern flat washer. Zinc plated steel.',
      type: 'variable',
      status: 'active',
      categoryId: washers.id,
    },
  });

  const washerVariants = [
    { sku: 'FW-USS-M6-ZN', name: 'M6 Zinc', dia: 6, thick: 1.6, price: 8, qty: 20000 },
    { sku: 'FW-USS-M8-ZN', name: 'M8 Zinc', dia: 8, thick: 1.6, price: 10, qty: 18000 },
    { sku: 'FW-USS-M10-ZN', name: 'M10 Zinc', dia: 10, thick: 2.0, price: 12, qty: 15000 },
    { sku: 'FW-USS-M12-ZN', name: 'M12 Zinc', dia: 12, thick: 2.5, price: 15, qty: 12000 },
    { sku: 'FW-USS-M6-SS', name: 'M6 Stainless', dia: 6, thick: 1.6, price: 18, qty: 10000 },
    { sku: 'FW-USS-M8-SS', name: 'M8 Stainless', dia: 8, thick: 1.6, price: 22, qty: 9000 },
    { sku: 'FW-USS-M10-SS', name: 'M10 Stainless', dia: 10, thick: 2.0, price: 28, qty: 7500 },
    { sku: 'FW-USS-M12-SS', name: 'M12 Stainless', dia: 12, thick: 2.5, price: 35, qty: 6000 },
  ];

  for (let i = 0; i < washerVariants.length; i++) {
    const v = washerVariants[i];
    const mat = v.sku.includes('-SS') ? 'Stainless Steel' : 'Steel';
    const fin = v.sku.includes('-SS') ? 'Plain' : 'Zinc Plated';
    const variant = await prisma.productVariant.create({
      data: {
        productId: washerProduct.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { diameter: v.dia, thickness: v.thick, material: mat, finish: fin },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrDiameter.id, numberValue: v.dia },
        { variantId: variant.id, attributeId: attrThickness.id, numberValue: v.thick },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions[mat] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions[fin] },
      ],
    });
  }

  // --- HEX NUTS ---
  const nutProduct = await prisma.product.create({
    data: {
      name: 'Hex Nut, Grade 8',
      slug: 'hex-nut-grade-8',
      sku: 'NUT-HEX-G8',
      description: 'High-strength Grade 8 hex nut. Zinc plated.',
      type: 'variable',
      status: 'active',
      categoryId: nuts.id,
    },
  });

  const nutVariants = [
    { sku: 'NUT-G8-M6-ZN', name: 'M6 Zinc', dia: 6, pitch: 1.0, price: 12, qty: 25000 },
    { sku: 'NUT-G8-M8-ZN', name: 'M8 Zinc', dia: 8, pitch: 1.25, price: 15, qty: 22000 },
    { sku: 'NUT-G8-M10-ZN', name: 'M10 Zinc', dia: 10, pitch: 1.5, price: 20, qty: 18000 },
    { sku: 'NUT-G8-M12-ZN', name: 'M12 Zinc', dia: 12, pitch: 1.75, price: 28, qty: 15000 },
    { sku: 'NUT-G8-M16-ZN', name: 'M16 Zinc', dia: 16, pitch: 2.0, price: 45, qty: 10000 },
  ];

  for (let i = 0; i < nutVariants.length; i++) {
    const v = nutVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: nutProduct.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { diameter: v.dia, threadPitch: v.pitch, material: 'Steel', finish: 'Zinc Plated', grade: 'Grade 8' },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrDiameter.id, numberValue: v.dia },
        { variantId: variant.id, attributeId: attrThreadPitch.id, numberValue: v.pitch },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions['Steel'] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions['Zinc Plated'] },
        { variantId: variant.id, attributeId: attrGrade.id, optionId: gradeOptions['Grade 8'] },
      ],
    });
  }

  // --- STEEL SHEETS ---
  const steelSheetProduct = await prisma.product.create({
    data: {
      name: 'Cold Rolled Steel Sheet',
      slug: 'cold-rolled-steel-sheet',
      sku: 'CRSS',
      description: 'Cold rolled low-carbon steel sheet. Smooth finish, easy to form.',
      type: 'variable',
      status: 'active',
      categoryId: steelSheets.id,
    },
  });

  const sheetVariants = [
    { sku: 'CRSS-1-600-1200', name: '1mm x 600 x 1200mm', thick: 1.0, width: 600, len: 1200, price: 2500, qty: 200 },
    { sku: 'CRSS-1.5-600-1200', name: '1.5mm x 600 x 1200mm', thick: 1.5, width: 600, len: 1200, price: 3200, qty: 180 },
    { sku: 'CRSS-2-600-1200', name: '2mm x 600 x 1200mm', thick: 2.0, width: 600, len: 1200, price: 4100, qty: 150 },
    { sku: 'CRSS-3-600-1200', name: '3mm x 600 x 1200mm', thick: 3.0, width: 600, len: 1200, price: 5800, qty: 120 },
    { sku: 'CRSS-1-1000-2000', name: '1mm x 1000 x 2000mm', thick: 1.0, width: 1000, len: 2000, price: 5500, qty: 100 },
    { sku: 'CRSS-2-1000-2000', name: '2mm x 1000 x 2000mm', thick: 2.0, width: 1000, len: 2000, price: 8800, qty: 80 },
  ];

  for (let i = 0; i < sheetVariants.length; i++) {
    const v = sheetVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: steelSheetProduct.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { thickness: v.thick, width: v.width, length: v.len, material: 'Steel', finish: 'Plain' },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrThickness.id, numberValue: v.thick },
        { variantId: variant.id, attributeId: attrWidth.id, numberValue: v.width },
        { variantId: variant.id, attributeId: attrLength.id, numberValue: v.len },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions['Steel'] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions['Plain'] },
      ],
    });
  }

  // --- ALUMINUM BARS ---
  const aluBarProduct = await prisma.product.create({
    data: {
      name: 'Aluminum Round Bar, 6061-T6',
      slug: 'aluminum-round-bar-6061',
      sku: 'ALU-RB-6061',
      description: 'General-purpose 6061-T6 aluminum round bar. Good machinability.',
      type: 'variable',
      status: 'active',
      categoryId: aluminumBars.id,
    },
  });

  const aluVariants = [
    { sku: 'ALU-RB-10-300', name: '10mm x 300mm', dia: 10, len: 300, price: 450, qty: 500 },
    { sku: 'ALU-RB-12-300', name: '12mm x 300mm', dia: 12, len: 300, price: 580, qty: 450 },
    { sku: 'ALU-RB-16-300', name: '16mm x 300mm', dia: 16, len: 300, price: 820, qty: 400 },
    { sku: 'ALU-RB-20-300', name: '20mm x 300mm', dia: 20, len: 300, price: 1100, qty: 350 },
    { sku: 'ALU-RB-25-500', name: '25mm x 500mm', dia: 25, len: 500, price: 1850, qty: 250 },
    { sku: 'ALU-RB-30-500', name: '30mm x 500mm', dia: 30, len: 500, price: 2400, qty: 200 },
  ];

  for (let i = 0; i < aluVariants.length; i++) {
    const v = aluVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: aluBarProduct.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { diameter: v.dia, length: v.len, material: 'Aluminum', finish: 'Plain' },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrDiameter.id, numberValue: v.dia },
        { variantId: variant.id, attributeId: attrLength.id, numberValue: v.len },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOptions['Aluminum'] },
        { variantId: variant.id, attributeId: attrFinish.id, optionId: finishOptions['Plain'] },
      ],
    });
  }

  console.log('  Products, variants, and attribute values created');

  // ──────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────

  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const attrDefCount = await prisma.attributeDefinition.count();
  const catAttrCount = await prisma.categoryAttribute.count();
  const attrValCount = await prisma.variantAttributeValue.count();

  console.log('\nSeed complete:');
  console.log(`  Categories:          ${await prisma.category.count()}`);
  console.log(`  Attribute Defs:      ${attrDefCount}`);
  console.log(`  Attribute Options:   ${await prisma.attributeOption.count()}`);
  console.log(`  Category-Attributes: ${catAttrCount}`);
  console.log(`  Products:            ${productCount}`);
  console.log(`  Variants:            ${variantCount}`);
  console.log(`  Attribute Values:    ${attrValCount}`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
