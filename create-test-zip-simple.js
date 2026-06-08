const fs = require('fs');
const path = require('path');
const AdmZip = require('apps/api/node_modules/adm-zip');

// Create a test ZIP file with images in subfolders
const zip = new AdmZip();

// Use an existing PNG file from the project
const sourceImage = path.join(__dirname, 'apps/web/public/images/leaf_hero.png');

// Check if source exists
if (!fs.existsSync(sourceImage)) {
  console.error('Source image not found:', sourceImage);
  process.exit(1);
}

// Read source image once
const imageBuffer = fs.readFileSync(sourceImage);
console.log(`Source image size: ${imageBuffer.length} bytes`);

// Add files directly to ZIP (no temp directory needed)
zip.addFile('V-12345678.jpg', imageBuffer);
console.log('Added: V-12345678.jpg (root level variant)');

zip.addFile('P-87654321.jpg', imageBuffer);
console.log('Added: P-87654321.jpg (root level product)');

zip.addFile('CG-11223344.jpg', imageBuffer);
console.log('Added: CG-11223344.jpg (root level category)');

zip.addFile('subfolder1/V-55667788.jpg', imageBuffer);
console.log('Added: subfolder1/V-55667788.jpg (subfolder variant)');

zip.addFile('subfolder2/V-99887766.jpg', imageBuffer);
console.log('Added: subfolder2/V-99887766.jpg (subfolder variant)');

// Write ZIP
const zipPath = path.join(__dirname, 'test-images-with-subfolders.zip');
zip.writeZip(zipPath);

console.log(`\nTest ZIP created: ${zipPath}`);
const stats = fs.statSync(zipPath);
console.log(`ZIP file size: ${stats.size} bytes`);
