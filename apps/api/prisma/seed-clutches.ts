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
  console.log('Seeding clutches product data...\n');

  // Fetch existing cells under One-Way Clutches
  const knurledHub = await prisma.cell.findUnique({ where: { slug: 'roller-engagementknurled-hub' } });
  const keyedHub = await prisma.cell.findUnique({ where: { slug: 'roller-engagementkeyed-hub' } });
  const spragHub = await prisma.cell.findUnique({ where: { slug: 'sprag-engagementkeyed-hub' } });

  if (!knurledHub || !keyedHub || !spragHub) {
    console.error('Cells not found. Ensure the category/cell hierarchy exists first.');
    console.log('  knurledHub:', knurledHub?.id);
    console.log('  keyedHub:', keyedHub?.id);
    console.log('  spragHub:', spragHub?.id);
    process.exit(1);
  }

  // Get the leaf category "One-Way Clutches"
  const oneWayClutches = await prisma.category.findUnique({ where: { slug: 'one-way-clutches' } });
  if (!oneWayClutches) {
    console.error('Category "one-way-clutches" not found.');
    process.exit(1);
  }

  // ──────────────────────────────────────────
  // 1. Unit Definitions (upsert)
  // ──────────────────────────────────────────
  const unitMm = await prisma.unitDefinition.upsert({
    where: { symbol: 'mm' },
    update: {},
    create: { name: 'Millimeters', symbol: 'mm' },
  });

  const unitIn = await prisma.unitDefinition.upsert({
    where: { symbol: 'in' },
    update: {},
    create: { name: 'Inches', symbol: 'in' },
  });

  const unitNm = await prisma.unitDefinition.upsert({
    where: { symbol: 'N·m' },
    update: {},
    create: { name: 'Newton-meters', symbol: 'N·m' },
  });

  const unitRpm = await prisma.unitDefinition.upsert({
    where: { symbol: 'rpm' },
    update: {},
    create: { name: 'Revolutions per minute', symbol: 'rpm' },
  });

  console.log('  Units ready');

  // ──────────────────────────────────────────
  // 2. Attribute Definitions for Clutches
  // ──────────────────────────────────────────
  const attrBoreSize = await prisma.attributeDefinition.upsert({
    where: { slug: 'bore-size' },
    update: {},
    create: {
      name: 'Bore Size',
      slug: 'bore-size',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 1,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrOuterDia = await prisma.attributeDefinition.upsert({
    where: { slug: 'outer-diameter' },
    update: {},
    create: {
      name: 'Outer Diameter',
      slug: 'outer-diameter',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 2,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrWidth = await prisma.attributeDefinition.upsert({
    where: { slug: 'clutch-width' },
    update: {},
    create: {
      name: 'Width',
      slug: 'clutch-width',
      dataType: 'number',
      group: 'Dimensions',
      sortOrder: 3,
      filterType: 'RANGE',
      unitId: unitMm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrTorque = await prisma.attributeDefinition.upsert({
    where: { slug: 'static-torque' },
    update: {},
    create: {
      name: 'Static Torque',
      slug: 'static-torque',
      dataType: 'number',
      group: 'Performance',
      sortOrder: 4,
      filterType: 'RANGE',
      unitId: unitNm.id,
      isFilterable: true,
      isRequired: true,
    },
  });

  const attrMaxSpeed = await prisma.attributeDefinition.upsert({
    where: { slug: 'max-speed' },
    update: {},
    create: {
      name: 'Max Speed',
      slug: 'max-speed',
      dataType: 'number',
      group: 'Performance',
      sortOrder: 5,
      filterType: 'RANGE',
      unitId: unitRpm.id,
      isFilterable: true,
      isRequired: false,
    },
  });

  const attrMaterial = await prisma.attributeDefinition.upsert({
    where: { slug: 'clutch-material' },
    update: {},
    create: {
      name: 'Material',
      slug: 'clutch-material',
      dataType: 'enum',
      group: 'Material',
      sortOrder: 6,
      filterType: 'CHECKBOX',
      isFilterable: true,
      isRequired: true,
    },
  });

  // Material options
  const clutchMaterials = ['Steel', 'Stainless Steel', 'Hardened Steel'];
  const materialOpts: Record<string, string> = {};
  for (let i = 0; i < clutchMaterials.length; i++) {
    const opt = await prisma.attributeOption.upsert({
      where: { attributeId_value: { attributeId: attrMaterial.id, value: clutchMaterials[i].toLowerCase().replace(/\s+/g, '-') } },
      update: {},
      create: {
        attributeId: attrMaterial.id,
        label: clutchMaterials[i],
        value: clutchMaterials[i].toLowerCase().replace(/\s+/g, '-'),
        sortOrder: i,
      },
    });
    materialOpts[clutchMaterials[i]] = opt.id;
  }

  console.log('  Attributes ready');

  // ──────────────────────────────────────────
  // 3. Assign attributes to the leaf category
  // ──────────────────────────────────────────
  const clutchAttrs = [attrBoreSize, attrOuterDia, attrWidth, attrTorque, attrMaxSpeed, attrMaterial];
  for (const attr of clutchAttrs) {
    await prisma.categoryAttribute.upsert({
      where: { categoryId_attributeId: { categoryId: oneWayClutches.id, attributeId: attr.id } },
      update: {},
      create: { categoryId: oneWayClutches.id, attributeId: attr.id },
    });
  }

  // Also assign to cell attributes
  for (const cell of [knurledHub, keyedHub, spragHub]) {
    for (const attr of clutchAttrs) {
      await prisma.cellAttribute.upsert({
        where: { cellId_attributeId: { cellId: cell.id, attributeId: attr.id } },
        update: {},
        create: { cellId: cell.id, attributeId: attr.id },
      });
    }
  }

  console.log('  Category + Cell attribute assignments ready');

  // ──────────────────────────────────────────
  // 4. Products for "Roller Engagement—Knurled Hub"
  // ──────────────────────────────────────────
  const knurledProduct1 = await prisma.product.create({
    data: {
      name: 'One-Way Clutch, Roller Engagement, Knurled Hub',
      slug: 'one-way-clutch-roller-knurled',
      sku: 'OWC-RK-001',
      description: 'Roller-type one-way clutch with knurled hub for press-fit installation. Provides reliable backstop and overrunning capability.',
      type: 'variable',
      status: 'active',
      cellId: knurledHub.id,
      isFeatured: true,
    },
  });

  const knurledVariants = [
    { sku: 'OWC-RK-8X14', name: '8mm Bore x 14mm OD', bore: 8, od: 14, width: 12, torque: 1.8, speed: 6500, mat: 'Steel', price: 850, qty: 500 },
    { sku: 'OWC-RK-10X16', name: '10mm Bore x 16mm OD', bore: 10, od: 16, width: 12, torque: 2.5, speed: 6000, mat: 'Steel', price: 920, qty: 450 },
    { sku: 'OWC-RK-12X18', name: '12mm Bore x 18mm OD', bore: 12, od: 18, width: 14, torque: 3.8, speed: 5500, mat: 'Steel', price: 1050, qty: 380 },
    { sku: 'OWC-RK-16X22', name: '16mm Bore x 22mm OD', bore: 16, od: 22, width: 16, torque: 6.2, speed: 5000, mat: 'Steel', price: 1280, qty: 300 },
    { sku: 'OWC-RK-20X26', name: '20mm Bore x 26mm OD', bore: 20, od: 26, width: 16, torque: 9.5, speed: 4500, mat: 'Steel', price: 1520, qty: 250 },
    { sku: 'OWC-RK-25X32', name: '25mm Bore x 32mm OD', bore: 25, od: 32, width: 20, torque: 15.0, speed: 4000, mat: 'Hardened Steel', price: 1850, qty: 200 },
  ];

  const knurledProduct2 = await prisma.product.create({
    data: {
      name: 'Heavy-Duty One-Way Clutch, Knurled Hub, Stainless',
      slug: 'heavy-duty-owc-knurled-ss',
      sku: 'OWC-RK-SS-001',
      description: 'Corrosion-resistant stainless steel one-way clutch with knurled hub. Suitable for washdown and food-grade environments.',
      type: 'variable',
      status: 'active',
      cellId: knurledHub.id,
      isFeatured: false,
    },
  });

  const knurledSSVariants = [
    { sku: 'OWC-RK-SS-10X16', name: '10mm Bore x 16mm OD SS', bore: 10, od: 16, width: 12, torque: 2.2, speed: 5500, mat: 'Stainless Steel', price: 1650, qty: 150 },
    { sku: 'OWC-RK-SS-12X18', name: '12mm Bore x 18mm OD SS', bore: 12, od: 18, width: 14, torque: 3.4, speed: 5000, mat: 'Stainless Steel', price: 1880, qty: 120 },
    { sku: 'OWC-RK-SS-16X22', name: '16mm Bore x 22mm OD SS', bore: 16, od: 22, width: 16, torque: 5.6, speed: 4500, mat: 'Stainless Steel', price: 2200, qty: 100 },
    { sku: 'OWC-RK-SS-20X26', name: '20mm Bore x 26mm OD SS', bore: 20, od: 26, width: 16, torque: 8.5, speed: 4000, mat: 'Stainless Steel', price: 2650, qty: 80 },
  ];

  // Create variants for knurled products
  for (const variants of [
    { product: knurledProduct1, items: knurledVariants },
    { product: knurledProduct2, items: knurledSSVariants },
  ]) {
    for (let i = 0; i < variants.items.length; i++) {
      const v = variants.items[i];
      const variant = await prisma.productVariant.create({
        data: {
          productId: variants.product.id,
          sku: v.sku,
          name: v.name,
          price: v.price,
          quantity: v.qty,
          attributes: { bore: v.bore, od: v.od, width: v.width, torque: v.torque, speed: v.speed, material: v.mat },
          isDefault: i === 0,
          sortOrder: i,
        },
      });

      await prisma.variantAttributeValue.createMany({
        data: [
          { variantId: variant.id, attributeId: attrBoreSize.id, numberValue: v.bore },
          { variantId: variant.id, attributeId: attrOuterDia.id, numberValue: v.od },
          { variantId: variant.id, attributeId: attrWidth.id, numberValue: v.width },
          { variantId: variant.id, attributeId: attrTorque.id, numberValue: v.torque },
          { variantId: variant.id, attributeId: attrMaxSpeed.id, numberValue: v.speed },
          { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOpts[v.mat] },
        ],
      });
    }
  }

  console.log('  Knurled Hub products seeded');

  // ──────────────────────────────────────────
  // 5. Products for "Roller Engagement—Keyed Hub"
  // ──────────────────────────────────────────
  const keyedProduct1 = await prisma.product.create({
    data: {
      name: 'One-Way Clutch, Roller Engagement, Keyed Hub',
      slug: 'one-way-clutch-roller-keyed',
      sku: 'OWC-RKY-001',
      description: 'Roller-type one-way clutch with keyed hub for positive shaft engagement. Higher torque capacity than knurled variants.',
      type: 'variable',
      status: 'active',
      cellId: keyedHub.id,
      isFeatured: true,
    },
  });

  const keyedVariants = [
    { sku: 'OWC-RKY-12X28', name: '12mm Bore x 28mm OD', bore: 12, od: 28, width: 16, torque: 8.0, speed: 5000, mat: 'Steel', price: 1450, qty: 320 },
    { sku: 'OWC-RKY-16X32', name: '16mm Bore x 32mm OD', bore: 16, od: 32, width: 18, torque: 14.0, speed: 4500, mat: 'Steel', price: 1780, qty: 280 },
    { sku: 'OWC-RKY-20X37', name: '20mm Bore x 37mm OD', bore: 20, od: 37, width: 20, torque: 22.0, speed: 4000, mat: 'Steel', price: 2100, qty: 220 },
    { sku: 'OWC-RKY-25X42', name: '25mm Bore x 42mm OD', bore: 25, od: 42, width: 22, torque: 35.0, speed: 3500, mat: 'Hardened Steel', price: 2550, qty: 180 },
    { sku: 'OWC-RKY-30X47', name: '30mm Bore x 47mm OD', bore: 30, od: 47, width: 24, torque: 48.0, speed: 3200, mat: 'Hardened Steel', price: 2980, qty: 150 },
    { sku: 'OWC-RKY-35X55', name: '35mm Bore x 55mm OD', bore: 35, od: 55, width: 28, torque: 68.0, speed: 2800, mat: 'Hardened Steel', price: 3450, qty: 120 },
    { sku: 'OWC-RKY-40X62', name: '40mm Bore x 62mm OD', bore: 40, od: 62, width: 30, torque: 95.0, speed: 2500, mat: 'Hardened Steel', price: 4200, qty: 80 },
  ];

  for (let i = 0; i < keyedVariants.length; i++) {
    const v = keyedVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: keyedProduct1.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { bore: v.bore, od: v.od, width: v.width, torque: v.torque, speed: v.speed, material: v.mat },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrBoreSize.id, numberValue: v.bore },
        { variantId: variant.id, attributeId: attrOuterDia.id, numberValue: v.od },
        { variantId: variant.id, attributeId: attrWidth.id, numberValue: v.width },
        { variantId: variant.id, attributeId: attrTorque.id, numberValue: v.torque },
        { variantId: variant.id, attributeId: attrMaxSpeed.id, numberValue: v.speed },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOpts[v.mat] },
      ],
    });
  }

  console.log('  Keyed Hub products seeded');

  // ──────────────────────────────────────────
  // 6. Products for "Sprag Engagement—Keyed Hub"
  // ──────────────────────────────────────────
  const spragProduct1 = await prisma.product.create({
    data: {
      name: 'One-Way Clutch, Sprag Engagement, Keyed Hub',
      slug: 'one-way-clutch-sprag-keyed',
      sku: 'OWC-SK-001',
      description: 'Sprag-type one-way clutch with keyed hub. Superior torque capacity and zero backlash. Ideal for indexing and backstop applications.',
      type: 'variable',
      status: 'active',
      cellId: spragHub.id,
      isFeatured: true,
    },
  });

  const spragVariants = [
    { sku: 'OWC-SK-12X32', name: '12mm Bore x 32mm OD', bore: 12, od: 32, width: 18, torque: 12.0, speed: 7000, mat: 'Hardened Steel', price: 2200, qty: 200 },
    { sku: 'OWC-SK-16X37', name: '16mm Bore x 37mm OD', bore: 16, od: 37, width: 20, torque: 20.0, speed: 6500, mat: 'Hardened Steel', price: 2650, qty: 180 },
    { sku: 'OWC-SK-20X42', name: '20mm Bore x 42mm OD', bore: 20, od: 42, width: 22, torque: 32.0, speed: 6000, mat: 'Hardened Steel', price: 3100, qty: 150 },
    { sku: 'OWC-SK-25X52', name: '25mm Bore x 52mm OD', bore: 25, od: 52, width: 26, torque: 55.0, speed: 5500, mat: 'Hardened Steel', price: 3800, qty: 120 },
    { sku: 'OWC-SK-30X62', name: '30mm Bore x 62mm OD', bore: 30, od: 62, width: 30, torque: 85.0, speed: 4500, mat: 'Hardened Steel', price: 4500, qty: 100 },
    { sku: 'OWC-SK-35X72', name: '35mm Bore x 72mm OD', bore: 35, od: 72, width: 34, torque: 120.0, speed: 4000, mat: 'Hardened Steel', price: 5200, qty: 80 },
    { sku: 'OWC-SK-40X80', name: '40mm Bore x 80mm OD', bore: 40, od: 80, width: 38, torque: 165.0, speed: 3500, mat: 'Hardened Steel', price: 6100, qty: 60 },
    { sku: 'OWC-SK-50X90', name: '50mm Bore x 90mm OD', bore: 50, od: 90, width: 42, torque: 240.0, speed: 3000, mat: 'Hardened Steel', price: 7500, qty: 40 },
  ];

  for (let i = 0; i < spragVariants.length; i++) {
    const v = spragVariants[i];
    const variant = await prisma.productVariant.create({
      data: {
        productId: spragProduct1.id,
        sku: v.sku,
        name: v.name,
        price: v.price,
        quantity: v.qty,
        attributes: { bore: v.bore, od: v.od, width: v.width, torque: v.torque, speed: v.speed, material: v.mat },
        isDefault: i === 0,
        sortOrder: i,
      },
    });

    await prisma.variantAttributeValue.createMany({
      data: [
        { variantId: variant.id, attributeId: attrBoreSize.id, numberValue: v.bore },
        { variantId: variant.id, attributeId: attrOuterDia.id, numberValue: v.od },
        { variantId: variant.id, attributeId: attrWidth.id, numberValue: v.width },
        { variantId: variant.id, attributeId: attrTorque.id, numberValue: v.torque },
        { variantId: variant.id, attributeId: attrMaxSpeed.id, numberValue: v.speed },
        { variantId: variant.id, attributeId: attrMaterial.id, optionId: materialOpts[v.mat] },
      ],
    });
  }

  console.log('  Sprag Hub products seeded');

  // ──────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const attrValCount = await prisma.variantAttributeValue.count();

  console.log('\nSeed complete:');
  console.log(`  Products:         ${productCount}`);
  console.log(`  Variants:         ${variantCount}`);
  console.log(`  Attribute Values: ${attrValCount}`);
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
